/**
 * PURRDAIN: a year of Pro Annual on us, for the people we met.
 * The promo's source of truth is the garden's pollen/promos/purrdain.yml;
 * the code and the source tags here must match it.
 */
export const PURRDAIN_CODE = "PURRDAIN";
export const PURRDAIN_CAMPAIGN = "purrdain";

/** Where a visitor carrying the code can have come from. */
export const PURRDAIN_SOURCES = ["card", "lockscreen"] as const;
export type PurrdainSource = (typeof PURRDAIN_SOURCES)[number] | "other";

/**
 * Only a known tag is ever counted or passed on, so a crafted `?src=` never
 * reaches the counter or the checkout metadata as free text.
 */
export function purrdainSource(value: string | null | undefined): PurrdainSource {
  const tag = value?.trim().toLowerCase();
  const known = PURRDAIN_SOURCES.find((source) => source === tag);
  return known ?? "other";
}

/**
 * The Pro Annual checkout link with the code prefilled. Polar checkout links
 * take `discount_code` (prefills the code field) and copy `utm_*` into the
 * checkout session's metadata, which is how redemptions are traced back to a
 * card or a lock screen.
 */
export function purrdainCheckoutUrl(checkoutLink: string, source: PurrdainSource): string {
  const url = new URL(checkoutLink);
  url.searchParams.set("discount_code", PURRDAIN_CODE);
  url.searchParams.set("utm_campaign", PURRDAIN_CAMPAIGN);
  url.searchParams.set("utm_source", source);
  return url.toString();
}
