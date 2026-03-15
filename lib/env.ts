const DEFAULT_APP_STORE_URL =
  "https://apps.apple.com/app/local-ai-chat/id6741502386";

export type BuySlug =
  | "pro-monthly"
  | "pro-annual"
  | "developer-mode"
  | "team-annual";

const checkoutUrls: Record<BuySlug, string | undefined> = {
  "pro-monthly": process.env.PADDLE_CHECKOUT_URL_PRO_MONTHLY,
  "pro-annual": process.env.PADDLE_CHECKOUT_URL_PRO_ANNUAL,
  "developer-mode": process.env.PADDLE_CHECKOUT_URL_DEVELOPER_MODE,
  "team-annual": process.env.PADDLE_CHECKOUT_URL_TEAM_ANNUAL
};

export function getCheckoutUrl(slug: BuySlug) {
  const value = checkoutUrls[slug];
  return value && value.trim().length > 0 ? value : null;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://localaicat.com";
}

export function getAppStoreUrl() {
  return process.env.NEXT_PUBLIC_APP_STORE_URL || DEFAULT_APP_STORE_URL;
}

export function getDirectDownloadUrl() {
  const value = process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL;
  return value && value.trim().length > 0 ? value : null;
}

export function getCustomerPortalUrl() {
  const value = process.env.PADDLE_CUSTOMER_PORTAL_URL;
  return value && value.trim().length > 0 ? value : null;
}

export function getPaddleEnvironment() {
  return process.env.PADDLE_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

export function getConfiguredProductIds() {
  return {
    proMonthly: process.env.PADDLE_PRODUCT_PRO_MONTHLY || null,
    proAnnual: process.env.PADDLE_PRODUCT_PRO_ANNUAL || null,
    developerMode: process.env.PADDLE_PRODUCT_DEVELOPER_MODE || null,
    teamAnnual: process.env.PADDLE_PRODUCT_TEAM_ANNUAL || null
  };
}

