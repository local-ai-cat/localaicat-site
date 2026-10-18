/**
 * What the Team page can honestly sell, decided from configuration alone.
 *
 * - "seats": a Polar product with a seat-based price is configured, so the
 *   buyer pays per seat and assigns each seat to a person, who gets their own
 *   license key.
 * - "single-license": no seat product, so the checkout is one Pro Annual
 *   license (one key, up to 5 Macs) whatever seat count was picked. The
 *   static POLAR_CHECKOUT_URL_TEAM_ANNUAL link must sell exactly that (in
 *   production it is the fixed £40 "Team Annual" product with the Pro key).
 * - "unavailable": nothing usable is configured, or a seat product is
 *   configured without the admin key to open seat checkouts.
 */
export type TeamCheckoutMode = "seats" | "single-license" | "unavailable";

export type TeamCheckoutConfig = {
  adminKey: string | null;
  teamProductId: string | null;
  proAnnualProductId: string | null;
  staticTeamUrl: string | null;
};

export function teamCheckoutMode(config: TeamCheckoutConfig): TeamCheckoutMode {
  if (config.teamProductId) return config.adminKey ? "seats" : "unavailable";
  if ((config.adminKey && config.proAnnualProductId) || config.staticTeamUrl) return "single-license";
  return "unavailable";
}

export function successUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/+$/, "")}/success?checkout_id={CHECKOUT_ID}`;
}

/** The Polar checkout-session body for a mode that creates one, or null. */
export function teamCheckoutBody(
  mode: TeamCheckoutMode,
  seats: number,
  config: TeamCheckoutConfig,
  siteUrl: string
) {
  if (mode === "seats" && config.teamProductId) {
    return { products: [config.teamProductId], seats, success_url: successUrl(siteUrl) };
  }
  if (mode === "single-license" && config.adminKey && config.proAnnualProductId) {
    return { products: [config.proAnnualProductId], success_url: successUrl(siteUrl) };
  }
  return null;
}
