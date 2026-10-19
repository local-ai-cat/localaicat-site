import { getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import {
  getActivationTokenStore,
  type ActivationTokenStore
} from "./activation-token-store.ts";

import { isPlausibleCustomerSession, isPlausiblePolarId } from "./polar-buyer-session.ts";
export { isPlausiblePolarId } from "./polar-buyer-session.ts";

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
  /**
   * The `customer_session_token` Polar appends to the success URL when it
   * redirects the buyer. A cookieless viewer must present it: it proves the
   * caller came from the buyer's own redirect, not from a leaked checkout id.
   */
  customerSessionToken?: string | null;
};

type PolarCheckout = {
  status?: string;
  customer_id?: string;
  created_at?: string;
  modified_at?: string;
  subscription_id?: string | null;
  product_id?: string | null;
  /** Set only on a checkout for a seat-based price. */
  seats?: number | null;
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
 * Window during which a verified buyer can reveal the license key.
 *
 *  - Time gate (REVEAL_WINDOW_MS): anything older is hidden for everyone.
 *  - First-visit grace (FIRST_VISIT_GRACE_MS): a live Polar session matching
 *    the checkout's customer can claim one browser-bound reveal cookie.
 *  - Cookie bind: subsequent polling/reloads need that signed cookie.
 *    Sharing the checkout URL alone never grants access to a license key.
 */
export const REVEAL_WINDOW_MS = 30 * 60 * 1000;
export const FIRST_VISIT_GRACE_MS = 5 * 60 * 1000;

/**
 * Hard ceiling measured from the checkout's immutable `created_at`. Even a
 * holder of a freshly minted, valid cookie cannot extend the reveal past
 * this. Updates to the provider checkout cannot extend a buyer's reveal
 * indefinitely.
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
  /** Wall-clock time at which the browser-bound reveal expires (null = no key). */
  revealExpiresAt: string | null;
  /** Why a key is hidden, when applicable, for client-side messaging. */
  revealBlockedReason: "expired" | "cookie_required" | null;
  /** Plan slug ("pro-monthly", "pro-annual", "developer-mode") or null for legacy/unknown. */
  plan: string | null;
  /** ISO-8601 wall-clock time at which the subscription renews. Null for non-recurring or unknown. */
  renewsAt: string | null;
  /**
   * Seats bought, for a seat-based (Team) checkout. Polar grants benefits to
   * the members the buyer assigns, never to the buyer, so such a checkout has
   * no license key of its own.
   */
  seats?: number;
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

function postCustomerSession(
  body: { customer_id: string; member_id?: string },
  adminKey: string,
  apiBase: string
) {
  return fetch(`${apiBase}/v1/customer-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
}

/**
 * The owner member of a team customer. Needs the admin key's members:read
 * scope; without it Polar answers 403 and the buyer recovers the key from the
 * customer portal instead.
 */
async function fetchOwnerMemberId(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBase}/v1/members/?customer_id=${encodeURIComponent(customerId)}&role=owner&limit=1`,
    { headers: { Authorization: `Bearer ${adminKey}` }, cache: "no-store" }
  );
  if (!response.ok) {
    console.error("Polar owner-member lookup failed:", response.status);
    return null;
  }
  const payload = (await response.json()) as { items?: { id?: string }[] };
  const memberId = payload.items?.[0]?.id;
  return memberId && isPlausiblePolarId(memberId) ? memberId : null;
}

/**
 * Once an email has bought Team seats, Polar makes its customer a team
 * customer and refuses a session that names no member ("member_id is
 * required for team customers"). A later Pro or Developer Mode purchase on
 * that email belongs to the buyer, the team's owner member, so the session is
 * retried as that member.
 */
async function createCustomerSession(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarCustomerSession | null> {
  let response = await postCustomerSession({ customer_id: customerId }, adminKey, apiBase);

  if (response.status === 422 && (await response.text()).includes("member_id")) {
    const memberId = await fetchOwnerMemberId(customerId, adminKey, apiBase);
    if (!memberId) {
      return null;
    }
    response = await postCustomerSession({ customer_id: customerId, member_id: memberId }, adminKey, apiBase);
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as PolarCustomerSession;
  return payload;
}

/**
 * True when `token` is a live Polar customer session for `customerId`. The
 * token authenticates as the customer, so Polar's own answer about who it is
 * decides; a team customer's session reports the team customer.
 */
async function isCheckoutCustomerSession(
  token: string | null | undefined,
  customerId: string,
  apiBase: string
): Promise<boolean> {
  if (!token || !isPlausibleCustomerSession(token)) return false;
  const response = await fetch(`${apiBase}/v1/customer-portal/customers/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) return false;
  const customer = (await response.json()) as { id?: string };
  return customer.id === customerId;
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

    // A Team purchase reveals no key: the buyer assigns its seats in the
    // customer portal and each member claims their own. Nothing secret is
    // returned, so the reveal gates below do not apply.
    if (typeof checkout.seats === "number" && checkout.seats > 0) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        revealExpiresAt: null,
        revealBlockedReason: null,
        plan: "team-annual",
        renewsAt: null,
        seats: checkout.seats
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

    // (2) Cookie gate: a first reveal must be recent, and its buyer proof is
    //     checked below before issuing a signed cookie. The grace is single-use
    //     per checkout, so a later Polar update cannot reopen first reveal.
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
    // (3) Buyer proof: a checkout id is only an identifier. First reveal needs
    //     a live Polar session belonging to this checkout's customer.
    if (cookieless && !(await isCheckoutCustomerSession(options.customerSessionToken, customerId, apiBase))) {
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

    // Do not mint custom-scheme bearer handoffs. Any local application can
    // register that scheme and redeem it for the permanent key.
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
      activationToken: null,
      activationTokenExpiresAt: null,
      revealExpiresAt: revealExpiry ? new Date(revealExpiry).toISOString() : null,
      revealBlockedReason: null,
      plan,
      renewsAt
    };
  } catch {
    return null;
  }
}
