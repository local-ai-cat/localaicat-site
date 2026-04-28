/**
 * @deprecated Token-based activation is being phased out in favour of
 * passing the license key directly. Kept for rollback; new callers should
 * use {@link activationLinkForLicenseKey}.
 */
export function activationLinkForToken(token: string) {
  const params = new URLSearchParams({ t: token });
  return `localaichat://activate?${params.toString()}`;
}

export function activationLinkForLicenseKey(licenseKey: string) {
  const params = new URLSearchParams({ key: licenseKey });
  return `localaichat://activate?${params.toString()}`;
}
