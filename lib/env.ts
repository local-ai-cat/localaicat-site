const DEFAULT_APP_STORE_URL =
  "https://apps.apple.com/app/local-ai-chat/id6741502386";
const DEFAULT_CUSTOMER_PORTAL_URL = "https://polar.sh/local-ai-cat/portal";
const POLAR_CHECKOUT_HOSTS = new Set([
  "polar.sh",
  "buy.polar.sh",
  "api.polar.sh",
  "sandbox.polar.sh",
  "sandbox-api.polar.sh"
]);

export type BuySlug =
  | "pro-monthly"
  | "pro-annual"
  | "developer-mode"
  | "team-annual";

function optionalValue(value: string | undefined) {
  const trimmed = value
    ?.replace(/^(?:\\r|\\n)+|(?:\\r|\\n)+$/g, "")
    .trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getCheckoutUrl(slug: BuySlug) {
  const checkoutUrls: Record<BuySlug, string | undefined> = {
    "pro-monthly": process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY,
    "pro-annual": process.env.POLAR_CHECKOUT_URL_PRO_ANNUAL,
    "developer-mode": process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE,
    "team-annual": process.env.POLAR_CHECKOUT_URL_TEAM_ANNUAL
  };

  const configured = optionalValue(checkoutUrls[slug]);
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      !POLAR_CHECKOUT_HOSTS.has(url.hostname) ||
      url.username || url.password || url.port
    ) {
      return null;
    }
    return configured;
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://localaicat.com").trim();
}

export function getAppStoreUrl() {
  return (process.env.NEXT_PUBLIC_APP_STORE_URL || DEFAULT_APP_STORE_URL).trim();
}

const DEFAULT_DIRECT_DOWNLOAD_URL =
  "https://github.com/local-ai-cat/localaicat-site/releases/latest/download/LocalAIChatDirect.dmg";

export function getDirectDownloadUrl() {
  // The GitHub "latest" alias is a stable fallback so preview deployments
  // (where the NEXT_PUBLIC_* release env is production-scoped) still offer a
  // real download instead of "Coming soon".
  return (
    optionalValue(process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL) ??
    DEFAULT_DIRECT_DOWNLOAD_URL
  );
}

/**
 * Where the site's download buttons point. With NEXT_PUBLIC_COUNTED_DOWNLOADS=1 they go through
 * /download/mac, which counts the click and redirects to the same DMG; otherwise straight to the DMG.
 * Structured data keeps the DMG's own URL either way.
 */
export function getDownloadLinkUrl() {
  return process.env.NEXT_PUBLIC_COUNTED_DOWNLOADS === "1" ? "/download/mac" : getDirectDownloadUrl();
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
  return optionalValue(process.env.NEXT_PUBLIC_HOMEBREW_TAP) ?? "local-ai-cat/tap";
}

export function getHomebrewCask() {
  return optionalValue(process.env.NEXT_PUBLIC_HOMEBREW_CASK) ?? "local-ai-cat";
}

export function getHomebrewInstallCommand() {
  const cask = getHomebrewCask();

  if (!cask) {
    return null;
  }

  // Single line: the commandBlock styling collapses newlines, and a one-liner
  // is what people paste into a terminal anyway.
  const tap = getHomebrewTap();
  return tap
    ? `brew tap ${tap} && brew install --cask ${cask}`
    : `brew install --cask ${cask}`;
}

export function getCustomerPortalUrl() {
  const configured = optionalValue(process.env.POLAR_CUSTOMER_PORTAL_URL);

  if (!configured) {
    return DEFAULT_CUSTOMER_PORTAL_URL;
  }

  try {
    const url = new URL(configured);
    if (
      url.hostname === "polar.sh" &&
      /^\/[^/]+\/portal\/?$/.test(url.pathname) &&
      url.pathname !== "/local-ai-cat/portal"
    ) {
      return DEFAULT_CUSTOMER_PORTAL_URL;
    }
  } catch {
    return DEFAULT_CUSTOMER_PORTAL_URL;
  }

  return configured;
}

export function getPolarAdminKey() {
  return optionalValue(process.env.POLAR_ADMIN_KEY);
}

/**
 * Keys the activation-token cipher and the reveal-cookie HMAC. There is no
 * fallback to POLAR_ADMIN_KEY: one leak would otherwise cover both the Polar
 * org and every token. Unset means tokens and cookies are unavailable.
 */
export function getActivationTokenSecret() {
  return optionalValue(process.env.ACTIVATION_TOKEN_SECRET);
}

/** Bearer token for /api/health/billing. Unset means the route does not exist. */
export function getBillingHealthToken() {
  return optionalValue(process.env.BILLING_HEALTH_TOKEN);
}

export function getActivationTokenRedisConfig() {
  const url =
    optionalValue(process.env.KV_REST_API_URL) ??
    optionalValue(process.env.UPSTASH_REDIS_REST_URL);
  const token =
    optionalValue(process.env.KV_REST_API_TOKEN) ??
    optionalValue(process.env.UPSTASH_REDIS_REST_TOKEN);

  return url && token ? { url, token } : null;
}

export function getPolarApiBaseUrl() {
  return optionalValue(process.env.POLAR_API_BASE_URL)?.replace(/\/+$/, "")
    || "https://api.polar.sh";
}

export function getPolarProductId(slug: "team-annual" | "pro-annual") {
  const ids: Record<string, string | undefined> = {
    "team-annual": process.env.POLAR_PRODUCT_ID_TEAM_ANNUAL,
    "pro-annual": process.env.POLAR_PRODUCT_ID_PRO_ANNUAL
  };
  return optionalValue(ids[slug]);
}

export function getTeamCheckoutConfig() {
  return {
    adminKey: getPolarAdminKey(),
    teamProductId: getPolarProductId("team-annual"),
    proAnnualProductId: getPolarProductId("pro-annual"),
    staticTeamUrl: getCheckoutUrl("team-annual")
  };
}

export function getDirectInstallScriptUrl() {
  return `${getSiteUrl().replace(/\/$/, "")}/install`;
}

export function getDirectInstallScriptCommand() {
  return `curl -fsSL ${getDirectInstallScriptUrl()} | sh`;
}
