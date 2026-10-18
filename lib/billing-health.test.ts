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

/** A Polar whose links each open a checkout with the given success URL. */
function polar(successUrls: Record<string, string | null>, calls: Calls, adminStatus = 200): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    calls.push({ url, init });
    if (url === `${API}/v1/checkouts/?limit=1`) {
      return Response.json({ items: [] }, { status: adminStatus });
    }
    const link = /\/v1\/checkout-links\/(polar_cl_[a-z]+)\/redirect$/.exec(url);
    if (link) {
      return new Response(null, { status: 307, headers: { location: `https://sandbox.polar.sh/checkout/polar_c_${link[1].slice(9)}` } });
    }
    const client = /\/v1\/checkouts\/client\/polar_c_([a-z]+)$/.exec(url);
    if (client) {
      return Response.json({ success_url: successUrls[client[1]] ?? null });
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

test("only the admin read carries the admin key; links and opened checkouts get no credential", async () => {
  const calls: Calls = [];
  await runBillingHealth(SITE, polar(HEALTHY, calls), pong);

  for (const call of calls) {
    const authorization = (call.init?.headers as Record<string, string> | undefined)?.Authorization;
    if (call.url === `${API}/v1/checkouts/?limit=1`) {
      assert.equal(authorization, `Bearer ${ADMIN_KEY}`);
    } else {
      assert.equal(authorization, undefined, `${call.url} must not see the admin key`);
    }
  }
  for (const call of calls.filter((entry) => entry.url.includes("/checkout-links/"))) {
    assert.equal(call.init?.redirect, "manual", "a redirect must never be followed blindly");
  }
});

test("the report never contains a configured secret or a checkout client secret", async () => {
  const report = await runBillingHealth(SITE, polar({ monthly: null, annual: "https://evil.example/success", dev: HEALTHY.dev }, [], 401), async () => {
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
  assert.match(report.checks["success_url_pro-annual"].detail, /meow\.localaicat\.com\/success, not https:\/\/localaicat\.com\/success/);
  assert.equal(report.checks["success_url_developer-mode"].ok, false);
  assert.equal(report.checks.polar_admin_key.ok, true);
});

test("a rejected admin key, a dead Redis and missing variables are reported by name", async () => {
  delete process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE;
  delete process.env.POLAR_PRODUCT_ID_TEAM_ANNUAL;
  const report = await runBillingHealth(SITE, polar(HEALTHY, [], 401), async () => {
    throw new Error("connection refused");
  });

  assert.equal(report.checks.polar_admin_key.ok, false);
  assert.match(report.checks.polar_admin_key.detail, /401/);
  assert.equal(report.checks.redis.ok, false);
  assert.match(report.checks.redis.detail, /connection refused/);
  assert.equal(report.checks.configuration.ok, false);
  assert.equal(report.checks.configuration.detail, "missing POLAR_CHECKOUT_URL_DEVELOPER_MODE, POLAR_PRODUCT_ID_TEAM_ANNUAL");
  assert.equal(report.checks["success_url_developer-mode"].ok, false);
});

test("an unconfigured Redis fails rather than passing silently", async () => {
  const report = await runBillingHealth(SITE, polar(HEALTHY, []), null);
  assert.equal(report.checks.redis.ok, false);
});

test("a checkout link that redirects off Polar is not followed", async () => {
  process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY = "https://buy.example.com/pro";
  const calls: Calls = [];
  const report = await runBillingHealth(SITE, polar(HEALTHY, calls), pong);

  assert.equal(report.checks["success_url_pro-monthly"].ok, false);
  assert.match(report.checks["success_url_pro-monthly"].detail, /leads off Polar/);
  assert.ok(!calls.some((call) => call.url.startsWith("https://buy.example.com")));
});

test("the check fails when the site URL is not the origin it ran on", async () => {
  const report = await runBillingHealth("https://meow.localaicat.com", polar(HEALTHY, []), pong);
  assert.equal(report.checks.site_url.ok, false);
  assert.equal(report.checks["success_url_team-annual"].ok, false);
});

test("isAuthorizedHealthCaller accepts only the exact bearer token", () => {
  assert.equal(isAuthorizedHealthCaller("Bearer right-token", "right-token"), true);
  assert.equal(isAuthorizedHealthCaller("Bearer wrong-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller("right-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller("Basic right-token", "right-token"), false);
  assert.equal(isAuthorizedHealthCaller(null, "right-token"), false);
});
