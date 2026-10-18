/**
 * Browser-to-app handoff link. It carries the single-use, five-minute
 * activation token, never the license key: any app can register the
 * localaichat:// scheme, so a token limits an interceptor to one redemption
 * that the success page then shows as claimed.
 */
export function activationLinkForToken(token: string) {
  const params = new URLSearchParams({ t: token });
  return `localaichat://activate?${params.toString()}`;
}
