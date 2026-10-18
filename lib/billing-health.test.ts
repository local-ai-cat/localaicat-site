import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedHealthCaller, runBillingHealth } from "./billing-health.ts";

const SITE = "https://localaicat.com";
const API = "https://sandbox-api.polar.sh";
const ADMIN_KEY = "polar_oat_health_secret";

const ENV: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: SITE,
  POLAR_API_BASE_URL: API,
  POLAR_ADMIN_KEY: ADMIN_KEY,
  ACTIVATION_TOKEN_SECRET: "activation-secret-value",
  KV_REST_API_URL: "https://kv.example.upstash.io",
  KV_REST_API_TOKEN: "kv-token-value",
  POLAR_CHECKOUT_URL_PRO_MONTHLY: `${API}/v1/checkout-links/polar_cl_monthly/redirect`,
  POLAR_CHECKOUT_URL_PRO_ANNUAL: `${API}/v1/checkout-links/polar_cl_annual/redirect`,
  POLAR_CHECKOUT_URL_DEVELOPER_MODE: `${API}/v1/checkout-links/polar_cl_dev/redirect`,
  POLAR_PRODUCT_ID_TEAM_ANNUAL: "prod_team_seats"
};
const ENV_NAMES = [...Object.keys(ENV), "POLAR_CHECKOUT_URL_TEAM_ANNUAL", "POLAR_PRODUCT_ID_PRO_ANNUAL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
const originalEnv = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));

test.beforeEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
  Object.assign(process.env, ENV);
});

test.after(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

type Calls = { url: string; init?: RequestInit }[];

const LINKS_PAGE = new RegExp(`^${API.replace(/\./g, "\\.")}/v1/checkout-links/\\?limit=100&page=(\\d+)$`);

type PolarOptions = { adminStatus?: number; linksStatus?: number; linksPerPage?: number };

/**
 * A Polar whose organization lists the site's three links (polar_cl_monthly,
 * polar_cl_annual, polar_cl_dev) with the given success URLs, after another
 * product's link.
 */
function polar(successUrls: Record<string, string | null>, calls: Calls, options: PolarOptions = {}): typeof fetch {
  const links = [
    { client_secret: "polar_cl_other", success_url: "https://elsewhere.example/thanks" },
    ...Object.entries(successUrls).map(([name, success_url]) => ({ client_secret: `polar_cl_${name}`, success_url }))
  ];
  const perPage = options.linksPerPage ?? links.length;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    calls.push({ url, init });
    if (url === `${API}/v1/checkouts/?limit=1`) {
      return Response.json({ items: [] }, { status: options.adminStatus ?? 200 });
    }
    const page = LINKS_PAGE.exec(url);
    if (page) {
      if (options.linksStatus === 403) {
        return Response.json({ error: "insufficient_scope", error_description: "The request requires higher privileges" }, { status: 403 });
      }
      if (options.linksStatus) return Response.json({ error: "boom" }, { status: options.linksStatus });
      const index = Number(page[1]) - 1;
      return Response.json({
        items: links.slice(index * perPage, (index + 1) * perPage),
        pagination: { total_count: links.length, max_page: Math.ceil(links.length / perPage) }
      });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

const HEALTHY = {
  monthly: `${SITE}/success?checkout_id=chk_m`,
  annual: `${SITE}/success?checkout_id=chk_a`,
  dev: `${SITE}/success?checkout_id=chk_d`
};

const pong = async () => "PONG";

test("a healthy setup passes every check", async () => {
  const calls: Calls = [];
  const report = await runBillingHealth(SITE, polar(HEALTHY, calls), pong);

  assert.equal(report.ok, true, JSON.stringify(report.checks));
  assert.deepEqual(Object.keys(report.checks).sort(), [
    "configuration",
    "polar_admin_key",
    "redis",
    "site_url",
    "success_url_developer-mode",
    "success_url_pro-annual",
    "success_url_pro-monthly",
    "success_url_team-annual"
  ]);
});

test("the check only reads: two admin-key GETs against the Polar API, no checkout opened", async () => {
  const calls: Calls = [];
  await runBillingHealth(SITE, polar(HEALTHY, calls), pong);

  assert.deepEqual(calls.map((call) => call.url).sort(), [
    `${API}/v1/checkout-links/?limit=100&page=1`,
    `${API}/v1/checkouts/?limit=1`
  ]);
  for (const call of calls) {
    assert.equal(call.init?.method ?? "GET", "GET");
    assert.equal((call.init?.headers as Record<string, string>).Authorization, `Bearer ${ADMIN_KEY}`);
  }
});

test("links on a later page are found", async () => {
  const calls: Calls = [];
  const report = await runBillingHealth(SITE, polar(HEALTHY, calls, { linksPerPage: 1 }), pong);

  assert.equal(report.ok, true, JSON.stringify(report.checks));
  assert.equal(calls.filter((call) => LINKS_PAGE.test(call.url)).length, 4);
});

test("a key without checkout_links:read skips the link checks instead of failing them", async () => {
  const report = await runBillingHealth(SITE, polar(HEALTHY, [], { linksStatus: 403 }), pong);

  assert.equal(report.ok, true, JSON.stringify(report.checks));
  for (const slug of ["pro-monthly", "pro-annual", "developer-mode"]) {
    assert.deepEqual(report.checks[`success_url_${slug}`], { ok: true, skipped: true, detail: "skipped: needs checkout_links:read" });
  }
});

test("any other link-listing failure fails the link checks", async () => {
  const report = await runBillingHealth(SITE, polar(HEALTHY, [], { linksStatus: 500 }), pong);

  assert.equal(report.ok, false);
  assert.equal(report.checks["success_url_pro-annual"].detail, "Polar answered 500 listing checkout links");
});

test("the report never contains a configured secret or a checkout client secret", async () => {
  const report = await runBillingHealth(SITE, polar({ monthly: null, annual: "https://evil.example/success", dev: HEALTHY.dev }, [], { adminStatus: 401 }), async () => {
    throw new Error("connection refused");
  });
  const text = JSON.stringify(report);

  assert.equal(report.ok, false);
  for (const secret of [ADMIN_KEY, ENV.ACTIVATION_TOKEN_SECRET, ENV.KV_REST_API_TOKEN, "polar_c_", "polar_cl_"]) {
    assert.ok(!text.includes(secret), `report leaked ${secret}`);
  }
});

test("a link without a success URL, or one that leaves the site, fails its own check", async () => {
  const report = await runBillingHealth(SITE, polar({
    monthly: null,
    annual: "https://meow.localaicat.com/success?checkout_id=chk_a",
    dev: `${SITE}/thanks?checkout_id=chk_d`
  }, []), pong);

  assert.equal(report.ok, false);
  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.match(report.checks["success_url_pro-monthly"].detail, /no success URL/);
  assert.equal(report.checks["success_url_pro-annual"].ok, false);
  assert.match(report.checks["success_url_pro-annual"].detail, /goes to https:\/\/meow\.localaicat\.com, not https:\/\/localaicat\.com/);
  assert.equal(report.checks["success_url_developer-mode"].ok, false);
  assert.equal(report.checks.polar_admin_key.ok, true);
});

test("a rejected admin key, a dead Redis and missing variables are reported by name", async () => {
  delete process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE;
  delete process.env.POLAR_PRODUCT_ID_TEAM_ANNUAL;
  const report = await runBillingHealth(SITE, polar(HEALTHY, [], { adminStatus: 401 }), async () => {
    throw new Error("connection refused");
  });

  assert.equal(report.checks.polar_admin_key.ok, false);
  assert.match(report.checks.polar_admin_key.detail, /401/);
  assert.equal(report.checks.redis.ok, false);
  assert.equal(report.checks.redis.detail, "Upstash Redis unreachable: Error", "error messages are reported by kind only");
  assert.equal(report.checks.configuration.ok, false);
  assert.equal(report.checks.configuration.detail, "missing POLAR_CHECKOUT_URL_DEVELOPER_MODE, POLAR_PRODUCT_ID_TEAM_ANNUAL");
  assert.equal(report.checks["success_url_developer-mode"].ok, false);
});

test("an unconfigured Redis fails rather than passing silently", async () => {
  const report = await runBillingHealth(SITE, polar(HEALTHY, []), null);
  assert.equal(report.checks.redis.ok, false);
});

test("a configured link Polar does not list, or a URL naming no link, fails", async () => {
  process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY = "https://buy.polar.sh/polar_cl_deleted";
  process.env.POLAR_CHECKOUT_URL_PRO_ANNUAL = "https://buy.example.com/pro";
  const calls: Calls = [];
  const report = await runBillingHealth(SITE, polar(HEALTHY, calls), pong);

  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.match(report.checks["success_url_pro-monthly"].detail, /no such checkout link/);
  assert.equal(report.checks["success_url_pro-annual"].ok, false);
  assert.match(report.checks["success_url_pro-annual"].detail, /not a Polar checkout link/);
  assert.ok(!calls.some((call) => !call.url.startsWith(API)), "only the Polar API is called");
});

test("a link secret outside a Polar URL's path does not count", async () => {
  process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY = "https://wrong.example/path?next=polar_cl_monthly";
  process.env.POLAR_CHECKOUT_URL_PRO_ANNUAL = `${API}/v1/elsewhere?link=polar_cl_annual`;
  const report = await runBillingHealth(SITE, polar(HEALTHY, []), pong);

  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.equal(report.checks["success_url_pro-annual"].ok, false);
});

test("a link list longer than the page cap fails instead of calling a link deleted", async () => {
  const many = Object.fromEntries(Array.from({ length: 600 }, (_, index) => [`filler${index}`, HEALTHY.monthly]));
  const report = await runBillingHealth(SITE, polar({ ...many, ...HEALTHY }, [], { linksPerPage: 100 }), pong);

  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.match(report.checks["success_url_pro-monthly"].detail, /not read to the end/);
});

test("a link's {CHECKOUT_ID} placeholder counts as carrying the checkout id", async () => {
  const report = await runBillingHealth(SITE, polar({ ...HEALTHY, monthly: `${SITE}/success?checkout_id={CHECKOUT_ID}` }, []), pong);
  assert.equal(report.checks["success_url_pro-monthly"].ok, true);
});

test("the check fails when the site URL is not the origin it ran on", async () => {
  const report = await runBillingHealth("https://meow.localaicat.com", polar(HEALTHY, []), pong);
  assert.equal(report.checks.site_url.ok, false);
  assert.equal(report.checks["success_url_team-annual"].ok, false);
});

test("a success URL on the site's own origin but the wrong page is not echoed", async () => {
  const report = await runBillingHealth(SITE, polar({ ...HEALTHY, monthly: `${SITE}/checkout/polar_c_leaked` }, []), pong);
  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.ok(!JSON.stringify(report).includes("polar_c_"));
});

test("isAuthorizedHealthCaller accepts only the exact bearer token", () => {
  assert.equal(isAuthorizedHealthCaller("Bearer right-token", "right-token"), true);
  assert.equal(isAuthorizedHealthCaller("Bearer wrong-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller("right-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller("Basic right-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller(null, "right-token"), false);
});
