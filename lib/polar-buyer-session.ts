/** Shared by Edge middleware and the checkout API; contains no server secrets. */
export const BUYER_SESSION_TTL_SECONDS = 5 * 60;
export const CUSTOMER_SESSION_HEADER = "x-polar-customer-session";
const POLAR_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CUSTOMER_SESSION_PATTERN = /^polar_(?:cst|mst)_[A-Za-z0-9_-]{16,128}$/;

export function isPlausiblePolarId(value: string): boolean {
  return POLAR_ID_PATTERN.test(value);
}

export function isPlausibleCustomerSession(value: string): boolean {
  return CUSTOMER_SESSION_PATTERN.test(value);
}

export function buyerSessionCookieName(checkoutId: string): string {
  return `__Host-lacat_buyer_${checkoutId}`;
}

/** Read once on arrival; never forward the provider bearer into rendered pages. */
export function buyerRedirect(url: URL): { cleanUrl: URL; checkoutId: string | null; token: string | null } | null {
  if (url.pathname !== "/success" || !url.searchParams.has("customer_session_token")) return null;
  const ids = url.searchParams.getAll("checkout_id");
  const tokens = url.searchParams.getAll("customer_session_token");
  const checkoutId = ids.length === 1 && isPlausiblePolarId(ids[0]) ? ids[0] : null;
  const token = checkoutId && tokens.length === 1 && isPlausibleCustomerSession(tokens[0]) ? tokens[0] : null;
  const cleanUrl = new URL("/success", url.origin);
  if (checkoutId) cleanUrl.searchParams.set("checkout_id", checkoutId);
  return { cleanUrl, checkoutId, token };
}
