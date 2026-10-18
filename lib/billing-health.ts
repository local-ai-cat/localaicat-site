import { createHash, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import {
  getActivationTokenRedisConfig,
  getActivationTokenSecret,
  getCheckoutUrl,
  getPolarAdminKey,
  getPolarApiBaseUrl,
  getSiteUrl,
  getTeamCheckoutConfig,
  type BuySlug
} from "./env.ts";
import { successUrl, teamCheckoutMode } from "./team-checkout.ts";

/**
 * A read-mostly billing check for the weekly job: does every piece the
 * checkout and the success page depend on still answer? Results name what is
 * wrong, never a configured value.
 */
export type CheckResult = { ok: boolean; detail: string };

export type BillingHealthReport = {
  ok: boolean;
  checkedAt: string;
  checks: Record<string, CheckResult>;
};

/** Products sold through a hosted Polar checkout link. Team opens its own checkouts. */
const STATIC_CHECKOUT_SLUGS = ["pro-monthly", "pro-annual", "developer-mode"] as const;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_LINK_REDIRECTS = 3;
const USER_AGENT = "localaicat-billing-health/1";

/** Polar's hosted checkout page: https://polar.sh/checkout/<client secret>. */
const CHECKOUT_PAGE_PATH = /^\/checkout\/(polar_c_[A-Za-z0-9_-]+)\/?$/;

export type RedisPing = () => Promise<unknown>;

function upstashPing(): RedisPing | null {
  const config = getActivationTokenRedisConfig();
  if (!config) return null;
  const redis = new Redis(config);
  return () => redis.ping();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Constant-time match of an `Authorization: Bearer …` header against the configured token. */
export function isAuthorizedHealthCaller(header: string | null, expected: string) {
  if (!header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(sha256(header.slice("Bearer ".length)), sha256(expected));
}

function pass(detail: string): CheckResult {
  return { ok: true, detail };
}

function fail(detail: string): CheckResult {
  return { ok: false, detail };
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "request failed";
}

function checkConfiguration(): CheckResult {
  const required: [string, unknown][] = [
    ["POLAR_ADMIN_KEY", getPolarAdminKey()],
    ["ACTIVATION_TOKEN_SECRET", getActivationTokenSecret()],
    ["KV_REST_API_URL and KV_REST_API_TOKEN", getActivationTokenRedisConfig()],
    ["POLAR_CHECKOUT_URL_PRO_MONTHLY", getCheckoutUrl("pro-monthly")],
    ["POLAR_CHECKOUT_URL_PRO_ANNUAL", getCheckoutUrl("pro-annual")],
    ["POLAR_CHECKOUT_URL_DEVELOPER_MODE", getCheckoutUrl("developer-mode")],
    ["POLAR_PRODUCT_ID_TEAM_ANNUAL", getTeamCheckoutConfig().teamProductId]
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) return fail(`missing ${missing.join(", ")}`);
  const mode = teamCheckoutMode(getTeamCheckoutConfig());
  if (mode !== "seats") return fail(`Team checkout is in "${mode}" mode, not "seats"`);
  return pass("every billing variable is set; Team sells seats");
}

async function checkPolarAdminKey(fetchImpl: typeof fetch): Promise<CheckResult> {
  const adminKey = getPolarAdminKey();
  if (!adminKey) return fail("POLAR_ADMIN_KEY is not set");
  try {
    const response = await fetchImpl(`${getPolarApiBaseUrl()}/v1/checkouts/?limit=1`, {
      headers: { Authorization: `Bearer ${adminKey}`, "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (response.ok) return pass("Polar accepted the admin key (checkouts:read)");
    return fail(`Polar answered ${response.status} to an authenticated read`);
  } catch (error) {
    return fail(`Polar unreachable: ${describeError(error)}`);
  }
}

async function checkRedis(ping: RedisPing | null): Promise<CheckResult> {
  if (!ping) return fail("Upstash Redis is not configured");
  try {
    const answer = await ping();
    return answer === "PONG" ? pass("Upstash Redis answered PONG") : fail("Upstash Redis gave an unexpected ping answer");
  } catch (error) {
    return fail(`Upstash Redis unreachable: ${describeError(error)}`);
  }
}

function isPolarHost(hostname: string) {
  return hostname === "polar.sh" || hostname.endsWith(".polar.sh");
}

/**
 * Follows a hosted checkout link to the checkout page it opens and returns
 * that checkout's client secret. Following the link makes Polar open an
 * unpaid checkout session, which expires on its own; no credential is sent.
 */
async function openCheckoutFromLink(linkUrl: string, fetchImpl: typeof fetch) {
  let url = new URL(linkUrl);
  for (let hop = 0; hop <= MAX_LINK_REDIRECTS; hop += 1) {
    if (url.protocol !== "https:" || !isPolarHost(url.hostname)) {
      throw new Error(`the link leads off Polar, to ${url.hostname}`);
    }
    const secret = CHECKOUT_PAGE_PATH.exec(url.pathname)?.[1];
    if (secret) return secret;
    const response = await fetchImpl(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      throw new Error(`the link answered ${response.status} instead of opening a checkout`);
    }
    url = new URL(location, url);
  }
  throw new Error("the link redirected too many times");
}

function describeSuccessUrl(value: string | null | undefined, siteOrigin: string): CheckResult {
  if (!value) return fail("no success URL: buyers stay on Polar's page and never see their key here");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("the success URL is not a URL");
  }
  const shown = `${url.origin}${url.pathname}`;
  if (url.origin !== siteOrigin || url.pathname !== "/success") {
    return fail(`the success URL is ${shown}, not ${siteOrigin}/success`);
  }
  if (!url.searchParams.get("checkout_id")) return fail(`the success URL ${shown} carries no checkout_id`);
  return pass(`returns buyers to ${shown}`);
}

async function checkStaticCheckout(slug: BuySlug, siteOrigin: string, fetchImpl: typeof fetch): Promise<CheckResult> {
  const linkUrl = getCheckoutUrl(slug);
  if (!linkUrl) return fail("no checkout link configured");
  try {
    const secret = await openCheckoutFromLink(linkUrl, fetchImpl);
    const response = await fetchImpl(`${getPolarApiBaseUrl()}/v1/checkouts/client/${encodeURIComponent(secret)}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) return fail(`Polar answered ${response.status} for the opened checkout`);
    const checkout = (await response.json()) as { success_url?: string | null };
    return describeSuccessUrl(checkout.success_url, siteOrigin);
  } catch (error) {
    return fail(describeError(error));
  }
}

function checkSiteUrl(siteOrigin: string): CheckResult {
  let configured: string;
  try {
    configured = new URL(getSiteUrl()).origin;
  } catch {
    return fail("NEXT_PUBLIC_SITE_URL is not a URL");
  }
  return configured === siteOrigin
    ? pass(`NEXT_PUBLIC_SITE_URL is ${configured}`)
    : fail(`NEXT_PUBLIC_SITE_URL is ${configured}, but this check ran on ${siteOrigin}`);
}

/**
 * `siteOrigin` is the origin the check was called on: every success URL must
 * bring the buyer back there.
 */
export async function runBillingHealth(
  siteOrigin: string,
  fetchImpl: typeof fetch = fetch,
  ping: RedisPing | null = upstashPing()
): Promise<BillingHealthReport> {
  const [polarAdminKey, redis, ...staticCheckouts] = await Promise.all([
    checkPolarAdminKey(fetchImpl),
    checkRedis(ping),
    ...STATIC_CHECKOUT_SLUGS.map((slug) => checkStaticCheckout(slug, siteOrigin, fetchImpl))
  ]);
  const checks: Record<string, CheckResult> = {
    configuration: checkConfiguration(),
    polar_admin_key: polarAdminKey,
    redis,
    site_url: checkSiteUrl(siteOrigin),
    ...Object.fromEntries(STATIC_CHECKOUT_SLUGS.map((slug, index) => [`success_url_${slug}`, staticCheckouts[index]])),
    // Team checkouts are opened by /api/team-checkout with this success URL.
    "success_url_team-annual": describeSuccessUrl(successUrl(getSiteUrl()).replace("{CHECKOUT_ID}", "x"), siteOrigin)
  };
  return {
    ok: Object.values(checks).every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    checks
  };
}
