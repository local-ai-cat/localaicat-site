import { getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import {
  issuePersistentActivationToken,
  type ActivationTokenStore
} from "./activation-token-store.ts";

type CheckoutLookupOptions = {
  includeCustomerPortalUrl?: boolean;
  activationTokenStore?: ActivationTokenStore | null;
  /**
   * True when the calling viewer has already set the per-checkout reveal
   * cookie (i.e. they are the original browser that landed on /success).
   * When false on the first call, callers should set the cookie before
   * returning the response so the same browser stays authorized.
   */
  viewerHasRevealCookie?: boolean;
};

type PolarCheckout = {
  status?: string;
  customer_id?: string;
  created_at?: string;
  modified_at?: string;
};

/**
 * Window during which the license key is exposed via the unauthenticated
 * /success?checkout_id=… URL.
 *
 * Three layers stacked:
 *  - Time gate (REVEAL_WINDOW_MS): anything older is hidden for everyone.
 *  - First-visit grace (FIRST_VISIT_GRACE_MS): right after checkout completes,
 *    we don't yet know which browser is the "original" one — Polar's redirect
 *    lands without our reveal cookie. During this short grace any caller
 *    receives the key AND gets the cookie set so subsequent requests are
 *    bound to that browser.
 *  - Cookie bind: after the grace expires, only the browser that received
 *    the cookie during the grace window can keep seeing the key. A URL
 *    shared elsewhere later → no reveal.
 */
export const REVEAL_WINDOW_MS = 30 * 60 * 1000;
export const FIRST_VISIT_GRACE_MS = 5 * 60 * 1000;

type PolarCustomerSession = {
  token?: string;
  customer_portal_url?: string;
};

type PolarLicenseKey = {
  key?: string;
  status?: string;
  created_at?: string;
};

export type CheckoutSuccessState = {
  checkoutStatus: string | null;
  customerId: string | null;
  customerPortalUrl: string | null;
  licenseKey: string | null;
  activationToken: string | null;
  activationTokenExpiresAt: string | null;
  /** Wall-clock time at which the unauthenticated reveal expires (null = no key). */
  revealExpiresAt: string | null;
  /** Why a key is hidden, when applicable, for client-side messaging. */
  revealBlockedReason: "expired" | "cookie_required" | null;
};

function isConfirmedCheckout(status: string | undefined) {
  return status === "confirmed" || status === "succeeded";
}

async function fetchCheckout(
  checkoutId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarCheckout | null> {
  const response = await fetch(`${apiBase}/v1/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PolarCheckout;
}

async function lookupGrantedLicenseKey(
  customerSessionToken: string,
  apiBase: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBase}/v1/customer-portal/license-keys?limit=20`,
    {
      headers: { Authorization: `Bearer ${customerSessionToken}` },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    items?: PolarLicenseKey[];
    result?: PolarLicenseKey[];
  };
  const items = payload.items ?? payload.result ?? [];
  const activeKey = items
    .filter((item) => item.status === "granted" && item.key)
    .sort((left, right) => {
      const leftCreatedAt = Date.parse(left.created_at ?? "");
      const rightCreatedAt = Date.parse(right.created_at ?? "");
      return (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0)
        - (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0);
    })[0];
  return activeKey?.key ?? null;
}

async function createCustomerSession(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarCustomerSession | null> {
  const response = await fetch(`${apiBase}/v1/customer-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ customer_id: customerId }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as PolarCustomerSession;
  return payload;
}

export async function resolveCheckoutSuccessState(
  checkoutId: string,
  options: CheckoutLookupOptions = {}
): Promise<CheckoutSuccessState | null> {
  try {
    const adminKey = getPolarAdminKey();
    if (!adminKey) {
      return null;
    }

    const apiBase = getPolarApiBaseUrl();
    const checkout = await fetchCheckout(checkoutId, adminKey, apiBase);
    if (!checkout) {
      return null;
    }

    const checkoutStatus = checkout.status ?? null;
    const customerId = checkout.customer_id ?? null;
    if (!isConfirmedCheckout(checkout.status) || !customerId) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: null,
        revealBlockedReason: null
      };
    }

    // ── Reveal gates ──────────────────────────────────────────────
    // (1) Time gate: hide the key for everyone once the checkout is older
    //     than REVEAL_WINDOW_MS — bounds blast radius of a leaked URL.
    const checkoutTimestamp = Date.parse(
      checkout.modified_at ?? checkout.created_at ?? ""
    );
    const revealExpiry = Number.isFinite(checkoutTimestamp)
      ? checkoutTimestamp + REVEAL_WINDOW_MS
      : null;
    if (revealExpiry !== null && Date.now() > revealExpiry) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: null,
        revealBlockedReason: "expired"
      };
    }

    // (2) Cookie gate: after the first-visit grace expires, only the
    //     browser that has the reveal cookie keeps seeing the key. Within
    //     the grace we treat any caller as the legitimate original visitor
    //     and the route handler will set the cookie on the response.
    const insideGrace = Number.isFinite(checkoutTimestamp)
      ? Date.now() - checkoutTimestamp <= FIRST_VISIT_GRACE_MS
      : false;
    if (options.viewerHasRevealCookie === false && !insideGrace) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: revealExpiry ? new Date(revealExpiry).toISOString() : null,
        revealBlockedReason: "cookie_required"
      };
    }

    const customerSession = await createCustomerSession(customerId, adminKey, apiBase);
    const licenseKey = customerSession?.token
      ? await lookupGrantedLicenseKey(customerSession.token, apiBase)
      : null;
    const activationTokenRecord = licenseKey
      ? await issuePersistentActivationToken({
          checkoutId,
          customerId,
          licenseKey
        }, options.activationTokenStore)
      : null;
    const customerPortalUrl = options.includeCustomerPortalUrl === false
      ? null
      : customerSession?.customer_portal_url ?? null;

    return {
      checkoutStatus,
      customerId,
      customerPortalUrl,
      licenseKey,
      activationToken: activationTokenRecord?.token ?? null,
      activationTokenExpiresAt: activationTokenRecord?.expiresAt.toISOString() ?? null,
      revealExpiresAt: revealExpiry ? new Date(revealExpiry).toISOString() : null,
      revealBlockedReason: null
    };
  } catch {
    return null;
  }
}

/**
 * Stable cookie name for the per-checkout reveal binding. Hashing the
 * checkout id keeps cookies short and doesn't echo the id back in
 * Set-Cookie headers, which can be useful in logs.
 */
export function revealCookieNameForCheckout(checkoutId: string): string {
  // Lightweight FNV-1a hash; collisions are not a security concern here —
  // the cookie is just a per-browser flag scoped by name. We just want
  // something stable and short that varies with the checkout id.
  let hash = 0x811c9dc5;
  for (let i = 0; i < checkoutId.length; i++) {
    hash ^= checkoutId.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return `lacat_v1_${hash.toString(16)}`;
}
