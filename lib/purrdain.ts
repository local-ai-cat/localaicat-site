/**
 * PURRDAIN: a year of Pro Annual on us, for the people we met.
 * The promo's source of truth is the garden's pollen/promos/purrdain.yml;
 * the code and the source tags here must match it.
 */
export const PURRDAIN_CODE = "PURRDAIN";
export const PURRDAIN_CAMPAIGN = "purrdain";
/** The code's discount at Polar; public, it is only an id. */
export const PURRDAIN_DISCOUNT_ID = "ea01f1ca-f9fd-44fd-b205-3d39afd774e5";

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

/** How many years of Pro the code still has, out of how many. */
export type PurrdainStock = { left: number; total: number };

type PolarDiscount = { max_redemptions?: number | null; redemptions_count?: number | null };

/** Null when the discount has no limit, so there is nothing to count down. */
export function purrdainStockFromDiscount(discount: PolarDiscount): PurrdainStock | null {
  const total = discount.max_redemptions;
  if (!total || total < 1) {
    return null;
  }
  const used = discount.redemptions_count ?? 0;
  return { left: Math.max(total - used, 0), total };
}

const STOCK_REVALIDATE_SECONDS = 300;
const STOCK_TIMEOUT_MS = 3_000;

type StockSource = {
  adminKey: string | null;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
};

/**
 * Reads the code's redemptions from Polar with the site's admin key
 * (discounts:read), cached for five minutes. Any failure, including a key
 * without the scope, hides the count instead of breaking the page.
 */
export async function fetchPurrdainStock({
  adminKey,
  apiBaseUrl,
  fetchImpl = fetch
}: StockSource): Promise<PurrdainStock | null> {
  if (!adminKey) {
    return null;
  }
  try {
    const response = await fetchImpl(`${apiBaseUrl}/v1/discounts/${PURRDAIN_DISCOUNT_ID}`, {
      headers: { Authorization: `Bearer ${adminKey}` },
      next: { revalidate: STOCK_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(STOCK_TIMEOUT_MS)
    });
    if (!response.ok) {
      return null;
    }
    return purrdainStockFromDiscount((await response.json()) as PolarDiscount);
  } catch {
    return null;
  }
}
