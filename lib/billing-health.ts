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
 * A read-only billing check for the weekly job: does every piece the
 * checkout and the success page depend on still answer? Results name what is
 * wrong, never a configured value.
 */
export type CheckResult = { ok: boolean; detail: string; skipped?: boolean };

export type BillingHealthReport = {
  ok: boolean;
  checkedAt: string;
  checks: Record<string, CheckResult>;
};

/** Products sold through a hosted Polar checkout link. Team opens its own checkouts. */
const STATIC_CHECKOUT_SLUGS = ["pro-monthly", "pro-annual", "developer-mode"] as const;

const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "localaicat-billing-health/1";
const LINK_PAGE_SIZE = 100;
const MAX_LINK_PAGES = 5;

/** A hosted link names itself by client secret: …/checkout-links/polar_cl_…/redirect or buy.polar.sh/polar_cl_…. */
const LINK_SECRET = /(polar_cl_[A-Za-z0-9_-]+)/;

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

/** Passes, but says the check could not run with the key's current scopes. */
function skip(detail: string): CheckResult {
  return { ok: true, skipped: true, detail };
}

/** Library and network errors are reported by kind only: their messages can carry URLs or ids. */
function describeError(error: unknown) {
  return error instanceof Error ? error.name : "request failed";
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

type PolarCheckoutLink = { client_secret?: string; success_url?: string | null };

type LinkLookup =
  | { kind: "listed"; links: PolarCheckoutLink[] }
  | { kind: "skipped" }
  | { kind: "failed"; detail: string };

/**
 * Every checkout link of the organization, read with the admin key
 * (checkout_links:read). A key without that scope skips the link checks
 * instead of failing them.
 */
async function listCheckoutLinks(fetchImpl: typeof fetch): Promise<LinkLookup> {
  const adminKey = getPolarAdminKey();
  if (!adminKey) return { kind: "failed", detail: "POLAR_ADMIN_KEY is not set" };
  const links: PolarCheckoutLink[] = [];
  try {
    for (let page = 1; page <= MAX_LINK_PAGES; page += 1) {
      const response = await fetchImpl(`${getPolarApiBaseUrl()}/v1/checkout-links/?limit=${LINK_PAGE_SIZE}&page=${page}`, {
        headers: { Authorization: `Bearer ${adminKey}`, "User-Agent": USER_AGENT },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      if (response.status === 403) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (body?.error === "insufficient_scope") return { kind: "skipped" };
      }
      if (!response.ok) return { kind: "failed", detail: `Polar answered ${response.status} listing checkout links` };
      const payload = (await response.json()) as {
        items?: PolarCheckoutLink[];
        pagination?: { max_page?: number };
      };
      links.push(...(payload.items ?? []));
      if (page >= (payload.pagination?.max_page ?? 1)) break;
    }
  } catch (error) {
    return { kind: "failed", detail: `Polar unreachable: ${describeError(error)}` };
  }
  return { kind: "listed", links };
}

function describeSuccessUrl(value: string | null | undefined, siteOrigin: string): CheckResult {
  if (!value) return fail("no success URL: buyers stay on Polar's page and never see their key here");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("the success URL is not a URL");
  }
  // Only the origin is echoed: a wrong path could hold a checkout secret.
  if (url.origin !== siteOrigin) {
    return fail(`the success URL goes to ${url.origin}, not ${siteOrigin}`);
  }
  if (url.pathname !== "/success") return fail(`the success URL is on ${url.origin} but not its /success page`);
  if (!url.searchParams.get("checkout_id")) return fail("the success URL carries no checkout_id");
  return pass(`returns buyers to ${url.origin}/success`);
}

function checkStaticCheckout(slug: BuySlug, siteOrigin: string, lookup: LinkLookup): CheckResult {
  const linkUrl = getCheckoutUrl(slug);
  if (!linkUrl) return fail("no checkout link configured");
  const secret = LINK_SECRET.exec(linkUrl)?.[1];
  if (!secret) return fail("the checkout URL names no Polar checkout link");
  switch (lookup.kind) {
  case "skipped": return skip("skipped: needs checkout_links:read");
  case "failed": return fail(lookup.detail);
  case "listed": {
    const link = lookup.links.find((item) => item.client_secret === secret);
    if (!link) return fail("Polar has no such checkout link: deleted, or another organization's");
    return describeSuccessUrl(link.success_url, siteOrigin);
  }
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
  const [polarAdminKey, redis, links] = await Promise.all([
    checkPolarAdminKey(fetchImpl),
    checkRedis(ping),
    listCheckoutLinks(fetchImpl)
  ]);
  const checks: Record<string, CheckResult> = {
    configuration: checkConfiguration(),
    polar_admin_key: polarAdminKey,
    redis,
    site_url: checkSiteUrl(siteOrigin),
    ...Object.fromEntries(STATIC_CHECKOUT_SLUGS.map((slug) => [`success_url_${slug}`, checkStaticCheckout(slug, siteOrigin, links)])),
    // Team checkouts are opened by /api/team-checkout with this success URL.
    "success_url_team-annual": describeSuccessUrl(successUrl(getSiteUrl()).replace("{CHECKOUT_ID}", "x"), siteOrigin)
  };
  return {
    ok: Object.values(checks).every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    checks
  };
}
