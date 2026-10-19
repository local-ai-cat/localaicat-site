/** No bearer is safe in a custom URL scheme: another app can claim the scheme. */
export function activationLinkForToken(_token: string): null {
  return null;
}

export const MANUAL_ACTIVATION_MESSAGE =
  "Open Local AI Cat, go to Settings → Activate License, and paste your license key. You can recover it by signing into the customer portal.";
