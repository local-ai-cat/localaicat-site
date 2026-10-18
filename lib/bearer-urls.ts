/**
 * Pages whose query string carries a bearer: /success?checkout_id= reveals a
 * license key during the first-visit grace and /activate?t= redeems one.
 * Third-party scripts must not run there, and URLs leaving the page lose the query.
 */
const BEARER_PATHS = ["/success", "/activate"];

export function isBearerPath(pathname: string) {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return BEARER_PATHS.includes(trimmed);
}

export function withoutQuery(url: string) {
  return url.split(/[?#]/, 1)[0];
}
