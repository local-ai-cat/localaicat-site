const DEFAULT_APP_STORE_URL =
  "https://apps.apple.com/app/local-ai-chat/id6741502386";

export type BuySlug =
  | "pro-monthly"
  | "pro-annual"
  | "developer-mode"
  | "team-annual";

const checkoutUrls: Record<BuySlug, string | undefined> = {
  "pro-monthly": process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY,
  "pro-annual": process.env.POLAR_CHECKOUT_URL_PRO_ANNUAL,
  "developer-mode": process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE,
  "team-annual": process.env.POLAR_CHECKOUT_URL_TEAM_ANNUAL
};

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getCheckoutUrl(slug: BuySlug) {
  return optionalValue(checkoutUrls[slug]);
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://localaicat.com").trim();
}

export function getAppStoreUrl() {
  return (process.env.NEXT_PUBLIC_APP_STORE_URL || DEFAULT_APP_STORE_URL).trim();
}

export function getDirectDownloadUrl() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL);
}

export function getDirectDownloadVersion() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_VERSION);
}

export function getDirectDownloadBuild() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_BUILD);
}

export function getDirectDownloadPublishedAt() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_PUBLISHED_AT);
}

export function getDirectDownloadFilename() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_FILENAME);
}

export function getDirectDownloadSha256() {
  return optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_SHA256);
}

export function getHomebrewTap() {
  return optionalValue(process.env.NEXT_PUBLIC_HOMEBREW_TAP);
}

export function getHomebrewCask() {
  return optionalValue(process.env.NEXT_PUBLIC_HOMEBREW_CASK);
}

export function getHomebrewInstallCommand() {
  const cask = getHomebrewCask();

  if (!cask) {
    return null;
  }

  const tap = getHomebrewTap();
  return tap
    ? `brew tap ${tap}\nbrew install --cask ${cask}`
    : `brew install --cask ${cask}`;
}

export function getCustomerPortalUrl() {
  return optionalValue(process.env.POLAR_CUSTOMER_PORTAL_URL);
}

export function getPolarAdminKey() {
  return optionalValue(process.env.POLAR_ADMIN_KEY);
}

export function getPolarApiBaseUrl() {
  return process.env.POLAR_API_BASE_URL || "https://api.polar.sh";
}

export function getPolarProductId(slug: "team-annual" | "pro-annual") {
  const ids: Record<string, string | undefined> = {
    "team-annual": process.env.POLAR_PRODUCT_ID_TEAM_ANNUAL,
    "pro-annual": process.env.POLAR_PRODUCT_ID_PRO_ANNUAL
  };
  return optionalValue(ids[slug]);
}

export function getDirectInstallScriptUrl() {
  return `${getSiteUrl().replace(/\/$/, "")}/install`;
}

export function getDirectInstallScriptCommand() {
  return `curl -fsSL ${getDirectInstallScriptUrl()} | sh`;
}
