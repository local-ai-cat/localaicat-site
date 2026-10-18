import { getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import {
  getActivationTokenStore,
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

type PolarBenefitGrant = {
  is_granted?: boolean;
  order_id?: string | null;
  subscription_id?: string | null;
  properties?: { license_key_id?: string | null } | null;
};

type PolarOrder = {
  id?: string;
  checkout_id?: string | null;
  subscription_id?: string | null;
};

type CheckoutOrders = { orderIds: Set<string>; subscriptionIds: Set<string> };

/**
 * Orders Polar created for this checkout. Each item's own checkout_id is
 * compared, so the result is right even if the query filter were ignored.
 */
async function fetchCheckoutOrders(
  checkoutId: string,
  adminKey: string,
  apiBase: string
): Promise<CheckoutOrders> {
  const orders: CheckoutOrders = { orderIds: new Set(), subscriptionIds: new Set() };
  const response = await fetch(
    `${apiBase}/v1/orders/?checkout_id=${encodeURIComponent(checkoutId)}&limit=10`,
    { headers: { Authorization: `Bearer ${adminKey}` }, cache: "no-store" }
  );
  if (!response.ok) return orders;
  const payload = (await response.json()) as { items?: PolarOrder[]; result?: PolarOrder[] };
  for (const order of payload.items ?? payload.result ?? []) {
    if (order.checkout_id !== checkoutId || !order.id) continue;
    orders.orderIds.add(order.id);
    if (order.subscription_id) orders.subscriptionIds.add(order.subscription_id);
  }
  return orders;
}

/**
 * Polar ids are UUIDs. Anything outside this alphabet (slashes, dots, `?`,
 * `#`, `%`) could re-route an admin-key request to another API path, so it is
 * rejected before any upstream call.
 */
const POLAR_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isPlausiblePolarId(value: string) {
  return POLAR_ID_PATTERN.test(value);
}

/** Polar's page-size maximum; one page covers any realistic customer. */
const LICENSE_KEY_PAGE_SIZE = 100;

type PolarSubscription = {
  id?: string;
  current_period_end?: string | null;
  recurring_interval?: "month" | "year" | string | null;
  cancel_at_period_end?: boolean | null;
  status?: string;
  product_id?: string | null;
  created_at?: string;
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

/** A grace claim outlives the ceiling, so it can never be claimed twice. */
const REVEAL_GRACE_CLAIM_SECONDS = Math.ceil(ABSOLUTE_REVEAL_CEILING_MS / 1000);

type PolarCustomerSession = {
  token?: string;
  customer_portal_url?: string;
};

type PolarLicenseKey = {
  id?: string;
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
  const response = await fetch(`${apiBase}/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PolarCheckout;
}

async function listCustomerPortal<T>(path: string, customerSessionToken: string, apiBase: string) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${customerSessionToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { items?: T[]; result?: T[] };
  return payload.items ?? payload.result ?? [];
}

/**
 * The license key this checkout produced. Polar attaches a checkout to a
 * customer by the email typed at checkout, so the customer record can hold
 * keys from other people's purchases; only keys whose grant belongs to this
 * checkout are eligible.
 */
async function lookupGrantedLicenseKey(
  customerSessionToken: string,
  checkoutId: string,
  orders: CheckoutOrders,
  apiBase: string
): Promise<string | null> {
  if (orders.orderIds.size === 0) return null;
  const grants = await listCustomerPortal<PolarBenefitGrant>(
    `/v1/customer-portal/benefit-grants/?checkout_id=${encodeURIComponent(checkoutId)}&type=license_keys&limit=${LICENSE_KEY_PAGE_SIZE}`,
    customerSessionToken,
    apiBase
  );
  const grantedKeyIds = new Set(
    (grants ?? [])
      .filter((grant) => grant.is_granted
        && grant.properties?.license_key_id
        && (orders.orderIds.has(grant.order_id ?? "") || orders.subscriptionIds.has(grant.subscription_id ?? "")))
      .map((grant) => grant.properties?.license_key_id as string)
  );
  if (grantedKeyIds.size === 0) return null;

  // Fetch each granted key by id: the customer's key list is oldest-first and
  // paginated, so this purchase's key may not be on its first page.
  const keys = await Promise.all([...grantedKeyIds].map(async (keyId) => {
    const response = await fetch(
      `${apiBase}/v1/customer-portal/license-keys/${encodeURIComponent(keyId)}`,
      { headers: { Authorization: `Bearer ${customerSessionToken}` }, cache: "no-store" }
    );
    return response.ok ? (await response.json()) as PolarLicenseKey : null;
  }));
  const activeKey = keys
    .filter((item): item is PolarLicenseKey => Boolean(item && item.status === "granted" && item.key && grantedKeyIds.has(item.id ?? "")))
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
  if (!isPlausiblePolarId(subscriptionId)) return null;
  const response = await fetch(`${apiBase}/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
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
 * subscriptions and picks the most recently updated one for this checkout's
 * product that started after the checkout did, so another purchase on the
 * same customer record never supplies the plan or renewal date.
 */
async function fetchLatestSubscriptionForCustomer(
  customerId: string,
  productId: string | null | undefined,
  checkoutCreatedAt: number,
  adminKey: string,
  apiBase: string
): Promise<PolarSubscription | null> {
  if (!productId || !Number.isFinite(checkoutCreatedAt)) return null;
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
  const items = (payload.items ?? payload.result ?? []).filter((item) =>
    item.product_id === productId && Date.parse(item.created_at ?? "") >= checkoutCreatedAt
  );
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
    if (!adminKey || !isPlausiblePolarId(checkoutId)) {
      return null;
    }

    const apiBase = getPolarApiBaseUrl();
    const store = options.activationTokenStore === undefined
      ? getActivationTokenStore()
      : options.activationTokenStore;
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
    //     The grace is single-use per checkout (claimed below, once this
    //     response is certain to bind a browser), so a later Polar update to
    //     `modified_at` or a second holder of the URL cannot reopen it.
    const insideGrace = Number.isFinite(checkoutModifiedAt)
      ? Date.now() - checkoutModifiedAt <= FIRST_VISIT_GRACE_MS
      : false;
    const cookieless = options.cookieIssuedAt == null;
    const cookieRequired: CheckoutSuccessState = {
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
    if (cookieless && (!insideGrace || !store)) {
      return cookieRequired;
    }

    const orders = await fetchCheckoutOrders(checkoutId, adminKey, apiBase);
    const customerSession = orders.orderIds.size > 0
      ? await createCustomerSession(customerId, adminKey, apiBase)
      : null;
    const licenseKey = customerSession?.token
      ? await lookupGrantedLicenseKey(customerSession.token, checkoutId, orders, apiBase)
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
          ?? await fetchLatestSubscriptionForCustomer(customerId, checkout.product_id, checkoutCreatedAt, adminKey, apiBase)
        : await fetchLatestSubscriptionForCustomer(customerId, checkout.product_id, checkoutCreatedAt, adminKey, apiBase);
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
        }, store)
      : null;
    const customerPortalUrl = options.includeCustomerPortalUrl === false
      ? null
      : customerSession?.customer_portal_url ?? null;

    // This response is the one the route binds to the browser with a reveal
    // cookie, so only now is the single-use grace spent. A failure earlier
    // leaves it for the buyer's retry.
    if (cookieless && !(await store?.claimRevealGrace(checkoutId, REVEAL_GRACE_CLAIM_SECONDS))) {
      return cookieRequired;
    }

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
