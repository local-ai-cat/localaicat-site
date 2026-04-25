export function activationLinkForToken(token: string) {
  const params = new URLSearchParams({ t: token });
  return `localaichat://activate?${params.toString()}`;
}

export function activationLinkForLicenseKey(licenseKey: string) {
  const params = new URLSearchParams({ license_key: licenseKey });
  return `localaichat://activate-license?${params.toString()}`;
}
