import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getActivationTokenSecret, getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import {
  issuePersistentActivationToken,
  type ActivationTokenStore
} from "./activation-token-store.ts";

type CheckoutLookupOptions = {
  includeCustomerPortalUrl?: boolean;
  activationTokenStore?: ActivationTokenStore | null;
  /**
   * Wall-clock time (ms) recorded in the per-browser reveal cookie's signed
   * payload. `null` means the caller has no valid cookie yet — first visit.
   * The route handler decodes the signed cookie and passes its issuedAt
   * here; if absent, the lookup may still succeed during the first-visit
   * grace and the route mints a fresh cookie on the response.
   */
  cookieIssuedAt?: number | null;
};

type PolarCheckout = {
  status?: string;
  customer_id?: string;
  created_at?: string;
  modified_at?: string;
  subscription_id?: string | null;
  product_id?: string | null;
};

type PolarSubscription = {
  id?: string;
  current_period_end?: string | null;
  recurring_interval?: "month" | "year" | string | null;
  cancel_at_period_end?: boolean | null;
  status?: string;
  product_id?: string | null;
};

/**
 * Maps a Polar subscription's `recurring_interval` to the plan slug the app
 * understands. For one-time purchases (`developer-mode`) Polar doesn't
 * create a subscription, so this only fires for recurring checkouts.
 */
function planSlugForInterval(
  interval: PolarSubscription["recurring_interval"]
): "pro-monthly" | "pro-annual" | null {
  switch (interval) {
  case "month": return "pro-monthly";
  case "year": return "pro-annual";
  default: return null;
  }
}

/**
 * Window during which the license key is exposed from the short-lived
 * /success?checkout_id=... bearer URL.
 *
 * Three layers stacked:
 *  - Time gate (REVEAL_WINDOW_MS): anything older is hidden for everyone.
 *  - First-visit grace (FIRST_VISIT_GRACE_MS): Polar's success redirect lands
 *    without our reveal cookie. During this short grace the success URL can
 *    receive the key and gets the cookie set for subsequent polling/reloads.
 *  - Cookie bind: after the grace expires, only the browser that received
 *    a valid signed cookie can keep seeing the key. A URL shared elsewhere
 *    later gets no reveal.
 */
export const REVEAL_WINDOW_MS = 30 * 60 * 1000;
export const FIRST_VISIT_GRACE_MS = 5 * 60 * 1000;

/**
 * Hard ceiling measured from the checkout's immutable `created_at`. Even a
 * holder of a freshly minted, valid cookie cannot extend the reveal past
 * this — protects against a long-tail leak where someone shares the URL
 * during the first-visit grace and then slowly drains keys over many days.
 */
export const ABSOLUTE_REVEAL_CEILING_MS = 24 * 60 * 60 * 1000;

const REVEAL_COOKIE_VERSION = "v1";

function revealCookieSignature(checkoutId: string, issuedAt: number) {
  const secret = getActivationTokenSecret();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`${checkoutId}.${issuedAt}`)
    .digest("base64url");
}

export function revealCookieNameForCheckout(checkoutId: string) {
  const digest = createHash("sha256")
    .update(checkoutId)
    .digest("base64url")
    .slice(0, 24);
  return `lac_reveal_${digest}`;
}

export function issueRevealCookieValue(checkoutId: string, issuedAt = Date.now()) {
  const signature = revealCookieSignature(checkoutId, issuedAt);
  if (!signature) return null;
  return `${REVEAL_COOKIE_VERSION}.${issuedAt}.${signature}`;
}

export function parseRevealCookieValue(checkoutId: string, value: string | undefined) {
  if (!value) return null;
  const [version, issuedAtString, signature] = value.split(".");
  if (version !== REVEAL_COOKIE_VERSION || !issuedAtString || !signature) return null;

  const issuedAt = Number(issuedAtString);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || issuedAt > Date.now() + 60_000) {
    return null;
  }

  const expected = revealCookieSignature(checkoutId, issuedAt);
  if (!expected) return null;

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  return issuedAt;
}

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
  /** Plan slug ("pro-monthly", "pro-annual", "developer-mode") or null for legacy/unknown. */
  plan: string | null;
  /** ISO-8601 wall-clock time at which the subscription renews. Null for non-recurring or unknown. */
  renewsAt: string | null;
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

async function fetchSubscription(
  subscriptionId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarSubscription | null> {
  const response = await fetch(`${apiBase}/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PolarSubscription;
}

/**
 * Fallback for the case where a confirmed checkout doesn't yet expose its
 * `subscription_id` (Polar can return the checkout as confirmed before the
 * subscription_id field propagates). Lists the customer's active
 * subscriptions and picks the most recently updated one.
 */
async function fetchLatestSubscriptionForCustomer(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarSubscription | null> {
  const url = `${apiBase}/v1/subscriptions/?customer_id=${encodeURIComponent(customerId)}&active=true&limit=5`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    items?: PolarSubscription[];
    result?: PolarSubscription[];
  };
  const items = payload.items ?? payload.result ?? [];
  if (items.length === 0) return null;
  // Most recent first by current_period_end (renewals get pushed forward).
  return items
    .slice()
    .sort((left, right) => {
      const leftEnd = Date.parse(left.current_period_end ?? "");
      const rightEnd = Date.parse(right.current_period_end ?? "");
      return (Number.isFinite(rightEnd) ? rightEnd : 0)
        - (Number.isFinite(leftEnd) ? leftEnd : 0);
    })[0];
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
        revealBlockedReason: null,
        plan: null,
        renewsAt: null
      };
    }

    // ── Reveal gates ──────────────────────────────────────────────
    // The per-viewer reveal window is anchored to the cookie's signed
    // `issuedAt` (immutable, can't be reopened by Polar updating the
    // checkout). For viewers who don't yet have a cookie we fall back to
    // `modified_at` to gate whether they're inside the first-visit grace.
    // `created_at` is the immutable absolute upper bound so even cookie
    // holders cannot extend the reveal indefinitely.
    const checkoutModifiedAt = Date.parse(
      checkout.modified_at ?? checkout.created_at ?? ""
    );
    const checkoutCreatedAt = Date.parse(checkout.created_at ?? "");
    const absoluteExpiry = Number.isFinite(checkoutCreatedAt)
      ? checkoutCreatedAt + ABSOLUTE_REVEAL_CEILING_MS
      : null;
    const revealStartedAt =
      typeof options.cookieIssuedAt === "number"
        ? options.cookieIssuedAt
        : Number.isFinite(checkoutModifiedAt)
          ? checkoutModifiedAt
          : null;
    const perViewerExpiry =
      revealStartedAt !== null ? revealStartedAt + REVEAL_WINDOW_MS : null;
    const revealExpiry = (() => {
      if (perViewerExpiry === null) return absoluteExpiry;
      if (absoluteExpiry === null) return perViewerExpiry;
      return Math.min(perViewerExpiry, absoluteExpiry);
    })();

    // (1) Time gate: hide the key for everyone once either bound passes.
    if (revealExpiry !== null && Date.now() > revealExpiry) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: null,
        revealBlockedReason: "expired",
        plan: null,
        renewsAt: null
      };
    }

    // (2) Cookie gate: after the first-visit grace expires, only viewers
    //     with a verified cookie continue to see the key. Within the grace
    //     the Polar success redirect is treated as a short-lived bearer URL
    //     and the route handler will mint a signed cookie.
    const insideGrace = Number.isFinite(checkoutModifiedAt)
      ? Date.now() - checkoutModifiedAt <= FIRST_VISIT_GRACE_MS
      : false;
    if (options.cookieIssuedAt == null && !insideGrace) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: revealExpiry ? new Date(revealExpiry).toISOString() : null,
        revealBlockedReason: "cookie_required",
        plan: null,
        renewsAt: null
      };
    }

    const customerSession = await createCustomerSession(customerId, adminKey, apiBase);
    const licenseKey = customerSession?.token
      ? await lookupGrantedLicenseKey(customerSession.token, apiBase)
      : null;

    // Resolve plan + renewal date from the underlying subscription, when one
    // exists (recurring purchases only — one-time products like
    // Developer Mode never produce a subscription on Polar).
    //
    // Prefer the checkout's own `subscription_id` when populated, but fall
    // back to listing the customer's active subscriptions because Polar
    // sometimes confirms a checkout before that field is filled in.
    let plan: string | null = null;
    let renewsAt: string | null = null;
    if (licenseKey) {
      const subscription = checkout.subscription_id
        ? await fetchSubscription(checkout.subscription_id, adminKey, apiBase)
          ?? await fetchLatestSubscriptionForCustomer(customerId, adminKey, apiBase)
        : await fetchLatestSubscriptionForCustomer(customerId, adminKey, apiBase);
      plan = planSlugForInterval(subscription?.recurring_interval);
      renewsAt = subscription?.current_period_end ?? null;
    }

    const activationTokenRecord = licenseKey
      ? await issuePersistentActivationToken({
          checkoutId,
          customerId,
          licenseKey,
          plan,
          renewsAt
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
      revealBlockedReason: null,
      plan,
      renewsAt
    };
  } catch {
    return null;
  }
}
