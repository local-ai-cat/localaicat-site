export function activationLinkFor(licenseKey: string) {
  const params = new URLSearchParams({ license_key: licenseKey });
  return `localaichat://activate-license?${params.toString()}`;
}
