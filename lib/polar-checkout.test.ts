import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryActivationTokenStore } from "./activation-token-store.ts";
import { redeemActivationToken } from "./activation-redeem.ts";
import { resolveCheckoutSuccessState } from "./polar-checkout.ts";

const GRANTS_PREFIX = "https://sandbox-api.polar.sh/v1/customer-portal/benefit-grants/?checkout_id=";

/** License-key ids Polar granted to each checkout; anything else on the customer record is someone else's purchase. */
const CHECKOUT_GRANTS = new Map<string, string[]>([
  ["chk_123", ["LOCALAI-PRO-OLDER", "LOCALAI-PRO-CURRENT"]],
  ["chk_recurring", ["LOCALAI-PRO-MONTHLY"]],
  ["chk_no_subid", ["LOCALAI-PRO-ANNUAL"]],
  ["chk_old", ["MEOW-PRO-LEAKED"]],
  ["chk_post_grace", ["MEOW-PRO-POST"]],
  ["chk_just_now", ["MEOW-PRO-JUSTNOW"]],
  ["chk_ok", ["MEOW-PRO-OK"]],
  ["chk_once", ["MEOW-PRO-ONCE"]],
  ["chk_nostore", ["MEOW-PRO-NOSTORE"]],
  ["chk_other_sub", ["MEOW-PRO-OS"]]
]);

const ORDERS_PREFIX = "https://sandbox-api.polar.sh/v1/orders/?checkout_id=";

function grantsResponse(url: string) {
  const checkoutId = decodeURIComponent(url.slice(GRANTS_PREFIX.length).split("&")[0]);
  assert.ok(url.includes("&type=license_keys"), "only license-key grants are requested");
  return Response.json({
    items: (CHECKOUT_GRANTS.get(checkoutId) ?? []).map((keyId) => ({
      is_granted: true,
      order_id: `ord_${checkoutId}`,
      properties: { license_key_id: keyId }
    }))
  });
}

/** Each checkout has one order, ord_<checkout id>. */
function ordersResponse(url: string) {
  const checkoutId = decodeURIComponent(url.slice(ORDERS_PREFIX.length).split("&")[0]);
  return Response.json({ items: [{ id: `ord_${checkoutId}`, checkout_id: checkoutId, subscription_id: null }] });
}

const originalFetch = globalThis.fetch;
const KEY_LIST_URL = "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100";
const KEY_BY_ID = /^https:\/\/sandbox-api\.polar\.sh\/v1\/customer-portal\/license-keys\/([^/?]+)$/;

// Each test mocks the customer's key list; the code fetches keys one id at a
// time, so this adapter answers those lookups from the test's list.
let testFetch: typeof fetch = originalFetch;
async function keyByIdAdapter(input: string | URL | Request, init?: RequestInit) {
  const match = KEY_BY_ID.exec(input.toString());
  if (!match) return testFetch(input, init);
  const list = await testFetch(KEY_LIST_URL, init);
  if (!list.ok) return list;
  const payload = (await list.json()) as { items?: { id?: string }[] };
  const item = (payload.items ?? []).find((key) => key.id === decodeURIComponent(match[1]));
  return item ? Response.json(item) : Response.json({ error: "not found" }, { status: 404 });
}
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  get: () => keyByIdAdapter,
  set: (value: typeof fetch) => { testFetch = value; }
});
const originalEnv = {
  ACTIVATION_TOKEN_SECRET: process.env.ACTIVATION_TOKEN_SECRET,
  POLAR_ADMIN_KEY: process.env.POLAR_ADMIN_KEY,
  POLAR_API_BASE_URL: process.env.POLAR_API_BASE_URL
};

test.beforeEach(() => {
  process.env.ACTIVATION_TOKEN_SECRET = "test-activation-secret";
  process.env.POLAR_ADMIN_KEY = "polar_oat_test";
  process.env.POLAR_API_BASE_URL = "https://sandbox-api.polar.sh";
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.after(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("resolveCheckoutSuccessState scopes license lookup through a customer session", async () => {
  const requestedUrls: string[] = [];
  const store = createInMemoryActivationTokenStore();
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();

  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    requestedUrls.push(url);
    const headers = init?.headers as Record<string, string> | undefined;

    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_123") {
      assert.equal(headers?.Authorization, "Bearer polar_oat_test");
      return Response.json({
        status: "confirmed",
        customer_id: "cust_123",
        product_id: "prod_pro",
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      assert.equal(init?.method, "POST");
      assert.equal(init?.body, JSON.stringify({ customer_id: "cust_123" }));
      return Response.json({
        token: "polar_cst_test",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      assert.equal(headers?.Authorization, "Bearer polar_cst_test");
      return Response.json({
        items: [
          {
            id: "LOCALAI-PRO-OLDER",
            key: "LOCALAI-PRO-OLDER",
            status: "granted",
            created_at: new Date(Date.now() - 20 * 1000).toISOString()
          },
          {
            id: "LOCALAI-PRO-CURRENT",
            key: "LOCALAI-PRO-CURRENT",
            status: "granted",
            created_at: new Date(Date.now() - 10 * 1000).toISOString()
          }
        ]
      });
    }

    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);

    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_123", {
    activationTokenStore: store
  });

  assert.equal(state?.checkoutStatus, "confirmed");
  assert.equal(state?.customerId, "cust_123");
  assert.equal(state?.customerPortalUrl, "https://polar.sh/portal/session");
  assert.equal(state?.licenseKey, "LOCALAI-PRO-CURRENT");
  assert.ok(state?.activationToken);
  assert.ok(!requestedUrls.some((url) => url.includes("/v1/license-keys?customer_id=")));

  const redeemed = await redeemActivationToken(state.activationToken, { store });
  assert.equal(redeemed.status, 200);
  assert.deepEqual(redeemed.body, {
    checkout_id: "chk_123",
    customer_id: "cust_123",
    license_key: "LOCALAI-PRO-CURRENT",
    plan: null,
    renews_at: null
  });
});

test("resolveCheckoutSuccessState includes plan and renewsAt for recurring subscriptions", async () => {
  const store = createInMemoryActivationTokenStore();
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  const renewsAt = "2026-06-01T00:00:00.000Z";

  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    const headers = init?.headers as Record<string, string> | undefined;

    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_recurring") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_recurring",
        product_id: "prod_pro",
        subscription_id: "sub_recurring",
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_test",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "LOCALAI-PRO-MONTHLY",
            key: "LOCALAI-PRO-MONTHLY",
            status: "granted",
            created_at: freshTimestamp
          }
        ]
      });
    }

    if (url === "https://sandbox-api.polar.sh/v1/subscriptions/sub_recurring") {
      assert.equal(headers?.Authorization, "Bearer polar_oat_test");
      return Response.json({
        id: "sub_recurring",
        recurring_interval: "month",
        current_period_end: renewsAt,
        cancel_at_period_end: false,
        status: "active"
      });
    }

    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);

    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_recurring", {
    activationTokenStore: store
  });

  assert.equal(state?.plan, "pro-monthly");
  assert.equal(state?.renewsAt, renewsAt);
  assert.ok(state?.activationToken);

  const redeemed = await redeemActivationToken(state.activationToken, { store });
  assert.equal(redeemed.status, 200);
  assert.deepEqual(redeemed.body, {
    checkout_id: "chk_recurring",
    customer_id: "cust_recurring",
    license_key: "LOCALAI-PRO-MONTHLY",
    plan: "pro-monthly",
    renews_at: renewsAt
  });
});

test("resolveCheckoutSuccessState falls back to customer subscription list when checkout.subscription_id is null", async () => {
  const store = createInMemoryActivationTokenStore();
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  const renewsAt = "2027-04-01T00:00:00.000Z";

  globalThis.fetch = async (input) => {
    const url = input.toString();

    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_no_subid") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_no_subid",
        product_id: "prod_pro",
        // subscription_id intentionally omitted — Polar sometimes hasn't
        // populated it yet at the moment the success page polls.
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_test",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "LOCALAI-PRO-ANNUAL",
            key: "LOCALAI-PRO-ANNUAL",
            status: "granted",
            created_at: freshTimestamp
          }
        ]
      });
    }

    if (url.startsWith("https://sandbox-api.polar.sh/v1/subscriptions/?customer_id=")) {
      return Response.json({
        items: [
          {
            id: "sub_recent",
            product_id: "prod_pro",
            created_at: freshTimestamp,
            recurring_interval: "year",
            current_period_end: renewsAt,
            cancel_at_period_end: false,
            status: "active"
          }
        ]
      });
    }

    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);

    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_no_subid", {
    activationTokenStore: store
  });

  assert.equal(state?.plan, "pro-annual");
  assert.equal(state?.renewsAt, renewsAt);
});

test("resolveCheckoutSuccessState redacts the license key after the reveal window expires", async () => {
  // The absolute ceiling is anchored to the checkout's immutable created_at
  // so even a viewer holding a freshly minted cookie cannot extend the
  // reveal past it. Use a checkout created 48h ago — past the 24h ceiling.
  const store = createInMemoryActivationTokenStore();
  const staleCreated = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const staleModified = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_old") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_old",
        product_id: "prod_pro",
        created_at: staleCreated,
        modified_at: staleModified
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_test",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "MEOW-PRO-LEAKED",
            key: "MEOW-PRO-LEAKED",
            status: "granted",
            created_at: staleCreated
          }
        ]
      });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_old", {
    activationTokenStore: store,
    cookieIssuedAt: Date.now()
  });

  assert.equal(state?.checkoutStatus, "confirmed");
  assert.equal(state?.customerId, "cust_old", "customer id may still surface for portal links");
  assert.equal(state?.licenseKey, null, "license key must be hidden once the reveal window passes");
  assert.equal(state?.activationToken, null, "no token should be minted for stale checkouts");
  assert.equal(state?.revealBlockedReason, "expired");
});

test("resolveCheckoutSuccessState refuses to reveal the key without the per-browser cookie", async () => {
  // After the first-visit grace expires, a viewer who lacks the per-checkout
  // reveal cookie (i.e. someone who received a forwarded URL after the
  // legit visitor already loaded the page) must not see the license key.
  const store = createInMemoryActivationTokenStore();
  // 10 minutes old — past the 5-minute first-visit grace, still within
  // the 30-minute reveal window.
  const postGraceTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_post_grace") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_post_grace",
        product_id: "prod_pro",
        created_at: postGraceTimestamp,
        modified_at: postGraceTimestamp
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_pg",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "MEOW-PRO-POST",
            key: "MEOW-PRO-POST",
            status: "granted",
            created_at: postGraceTimestamp
          }
        ]
      });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const stateForOuterViewer = await resolveCheckoutSuccessState("chk_post_grace", {
    activationTokenStore: store,
    cookieIssuedAt: null
  });

  assert.equal(stateForOuterViewer?.licenseKey, null, "key must be hidden for viewers without the cookie past the grace");
  assert.equal(stateForOuterViewer?.revealBlockedReason, "cookie_required");
  assert.ok(stateForOuterViewer?.revealExpiresAt, "client should still see a countdown so it can prompt the legit viewer");
});

test("resolveCheckoutSuccessState reveals the key during the first-visit grace even without a cookie", async () => {
  // Right after Polar redirects the customer to /success, our reveal
  // cookie hasn't been set yet. During the short first-visit grace the
  // legitimate visitor must still see the key — the route handler will
  // then set the cookie so subsequent requests are bound to that browser.
  const store = createInMemoryActivationTokenStore();
  const justNowTimestamp = new Date(Date.now() - 30 * 1000).toISOString(); // 30s ago

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_just_now") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_just_now",
        product_id: "prod_pro",
        created_at: justNowTimestamp,
        modified_at: justNowTimestamp
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_jn",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "MEOW-PRO-JUSTNOW",
            key: "MEOW-PRO-JUSTNOW",
            status: "granted",
            created_at: justNowTimestamp
          }
        ]
      });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_just_now", {
    activationTokenStore: store,
    cookieIssuedAt: null
  });

  assert.equal(state?.licenseKey, "MEOW-PRO-JUSTNOW", "first-visit grace must reveal the key to the legitimate visitor");
  assert.equal(state?.revealBlockedReason, null);
});

test("resolveCheckoutSuccessState reveals the license key to the cookie-bound viewer within the window", async () => {
  // Sanity check: the original viewer with the cookie inside the window
  // continues to see their key normally. This guards against a too-strict
  // gate breaking the happy path.
  const store = createInMemoryActivationTokenStore();
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_ok") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_ok",
        product_id: "prod_pro",
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_ok",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({
        items: [
          {
            id: "MEOW-PRO-OK",
            key: "MEOW-PRO-OK",
            status: "granted",
            created_at: freshTimestamp
          }
        ]
      });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_ok", {
    activationTokenStore: store,
    cookieIssuedAt: Date.now()
  });

  assert.equal(state?.licenseKey, "MEOW-PRO-OK");
  assert.equal(state?.revealBlockedReason, null);
  assert.ok(state?.revealExpiresAt);
});

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

type KeyFixture = { key: string; created_at: string };

function confirmedCheckoutFetch(checkoutId: string, keys: KeyFixture[], grantedToCheckout: string[], otherOrderGrants: string[] = []) {
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  return async (input: string | URL | Request) => {
    const url = input.toString();
    if (url === `https://sandbox-api.polar.sh/v1/checkouts/${checkoutId}`) {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_shared",
        product_id: "prod_pro",
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({ token: "polar_cst_shared" }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({ items: keys.map((key) => ({ ...key, id: key.key, status: "granted" })) });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) {
      return Response.json({ items: [
        ...grantedToCheckout.map((keyId) => ({ is_granted: true, order_id: `ord_${checkoutId}`, properties: { license_key_id: keyId } })),
        ...otherOrderGrants.map((keyId) => ({ is_granted: true, order_id: "ord_someone_else", properties: { license_key_id: keyId } }))
      ] });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };
}

test("resolveCheckoutSuccessState rejects ids outside the Polar id alphabet without calling Polar", async () => {
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    requestedUrls.push(input.toString());
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  for (const id of ["../subscriptions/sub_1", "chk_1?x=1", "chk_1#frag", "%2e%2e", "a/b", ""]) {
    const state = await resolveCheckoutSuccessState(id, {
      activationTokenStore: createInMemoryActivationTokenStore()
    });
    assert.equal(state, null, `id ${JSON.stringify(id)} must be rejected`);
  }
  assert.deepEqual(requestedUrls, []);
});

test("resolveCheckoutSuccessState grants the cookieless first-visit grace only once per checkout", async () => {
  const store = createInMemoryActivationTokenStore();
  globalThis.fetch = confirmedCheckoutFetch("chk_once", [
    { key: "MEOW-PRO-ONCE", created_at: secondsAgo(10) }
  ], ["MEOW-PRO-ONCE"]);

  const first = await resolveCheckoutSuccessState("chk_once", { activationTokenStore: store, cookieIssuedAt: null });
  const second = await resolveCheckoutSuccessState("chk_once", { activationTokenStore: store, cookieIssuedAt: null });
  const cookieHolder = await resolveCheckoutSuccessState("chk_once", { activationTokenStore: store, cookieIssuedAt: Date.now() });

  assert.equal(first?.licenseKey, "MEOW-PRO-ONCE");
  assert.equal(second?.licenseKey, null, "a second cookieless viewer must not reuse the grace");
  assert.equal(second?.revealBlockedReason, "cookie_required");
  assert.equal(cookieHolder?.licenseKey, "MEOW-PRO-ONCE", "the browser that claimed the grace keeps its reveal");
});

test("resolveCheckoutSuccessState keeps the grace closed when no store can record the claim", async () => {
  globalThis.fetch = confirmedCheckoutFetch("chk_nostore", [
    { key: "MEOW-PRO-NOSTORE", created_at: secondsAgo(10) }
  ], ["MEOW-PRO-NOSTORE"]);

  const state = await resolveCheckoutSuccessState("chk_nostore", { activationTokenStore: null, cookieIssuedAt: null });

  assert.equal(state?.licenseKey, null);
  assert.equal(state?.revealBlockedReason, "cookie_required");
});

test("resolveCheckoutSuccessState reveals only keys whose grant belongs to this checkout", async () => {
  // The customer record can hold newer keys from other purchases (another
  // product, or someone who checked out with the same email).
  globalThis.fetch = confirmedCheckoutFetch("chk_bound", [
    { key: "MEOW-DEV-OTHER-PURCHASE", created_at: secondsAgo(5) },
    { key: "MEOW-PRO-OTHER-PERSON", created_at: secondsAgo(3) },
    { key: "MEOW-PRO-OWN", created_at: secondsAgo(10) }
  ], ["MEOW-PRO-OWN"]);
  const bound = await resolveCheckoutSuccessState("chk_bound", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(bound?.licenseKey, "MEOW-PRO-OWN");

  globalThis.fetch = confirmedCheckoutFetch("chk_pending", [
    { key: "MEOW-PRO-OTHER-PERSON", created_at: secondsAgo(3) }
  ], []);
  const pending = await resolveCheckoutSuccessState("chk_pending", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(pending?.licenseKey, null, "nothing is revealed until this checkout's own grant exists");
});

test("resolveCheckoutSuccessState ignores another purchase's subscription in the customer fallback", async () => {
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_other_sub") {
      return Response.json({ status: "confirmed", customer_id: "cust_os", product_id: "prod_pro", created_at: freshTimestamp, modified_at: freshTimestamp });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({ token: "polar_cst_os" }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      return Response.json({ items: [{ id: "MEOW-PRO-OS", key: "MEOW-PRO-OS", status: "granted", created_at: freshTimestamp }] });
    }
    if (url.startsWith("https://sandbox-api.polar.sh/v1/subscriptions/?customer_id=")) {
      return Response.json({ items: [
        { id: "sub_older", product_id: "prod_pro", created_at: "2026-01-01T00:00:00Z", recurring_interval: "month", current_period_end: "2026-11-01T00:00:00Z" },
        { id: "sub_other_product", product_id: "prod_dev", created_at: freshTimestamp, recurring_interval: "year", current_period_end: "2027-10-01T00:00:00Z" }
      ] });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) return grantsResponse(url);
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_other_sub", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });

  assert.equal(state?.licenseKey, "MEOW-PRO-OS");
  assert.equal(state?.plan, null, "neither an older subscription nor another product's may supply the plan");
  assert.equal(state?.renewsAt, null);
});

test("resolveCheckoutSuccessState ignores grants from other orders even if Polar ignored the checkout filter", async () => {
  globalThis.fetch = confirmedCheckoutFetch("chk_filter", [
    { key: "MEOW-PRO-SOMEONE-ELSE", created_at: secondsAgo(2) },
    { key: "MEOW-PRO-MINE", created_at: secondsAgo(10) }
  ], ["MEOW-PRO-MINE"], ["MEOW-PRO-SOMEONE-ELSE"]);
  const mine = await resolveCheckoutSuccessState("chk_filter", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(mine?.licenseKey, "MEOW-PRO-MINE");

  globalThis.fetch = confirmedCheckoutFetch("chk_filter_none", [
    { key: "MEOW-PRO-SOMEONE-ELSE", created_at: secondsAgo(2) }
  ], [], ["MEOW-PRO-SOMEONE-ELSE"]);
  const none = await resolveCheckoutSuccessState("chk_filter_none", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(none?.licenseKey, null);
});

test("resolveCheckoutSuccessState finds this checkout's key however many older keys the customer holds", async () => {
  const olderKeys = Array.from({ length: 120 }, (_, index) => ({ key: `MEOW-PRO-OLD-${index}`, created_at: secondsAgo(86_400 + index) }));
  globalThis.fetch = confirmedCheckoutFetch("chk_many", [...olderKeys, { key: "MEOW-PRO-NEW", created_at: secondsAgo(5) }], ["MEOW-PRO-NEW"]);
  const state = await resolveCheckoutSuccessState("chk_many", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(state?.licenseKey, "MEOW-PRO-NEW");
});

/**
 * A Developer Mode checkout by an email that bought Team seats before: Polar
 * refuses a session without a member for such a "team customer".
 */
type TeamCustomerOptions = {
  /** Fields that override the confirmed, fresh Developer Mode checkout. */
  checkout?: Record<string, unknown>;
  /** False: Polar has no order for this checkout yet. */
  hasOrder?: boolean;
  /** Grants the owner member can see: [order id, key]. Defaults to this checkout's own key. */
  grants?: [string, string][];
  /** Every URL requested, in order. */
  requested?: string[];
};

const MEMBERS_URL = "https://sandbox-api.polar.sh/v1/members/?customer_id=cust_team_buyer&role=owner&limit=1";

function teamCustomerFetch(ownerLookup: () => Response, sessionBodies: string[], options: TeamCustomerOptions = {}) {
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  const grants = options.grants ?? [["ord_chk_team_then_dev", "MEOW-DEV-OWNER"]];
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    options.requested?.push(url);
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_team_then_dev") {
      return Response.json({
        status: "succeeded", customer_id: "cust_team_buyer", product_id: "prod_dev", created_at: freshTimestamp, modified_at: freshTimestamp,
        ...options.checkout
      });
    }
    if (url.startsWith(ORDERS_PREFIX) && options.hasOrder === false) return Response.json({ items: [] });
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      const body = String(init?.body);
      sessionBodies.push(body);
      if (!JSON.parse(body).member_id) {
        return Response.json({ error: "PolarRequestValidationError", detail: [{ loc: ["body", "member_id"], msg: "member_id is required for team customers." }] }, { status: 422 });
      }
      return Response.json({ token: "polar_cst_owner", customer_portal_url: "https://polar.sh/portal/owner" }, { status: 201 });
    }
    if (url === MEMBERS_URL) {
      return ownerLookup();
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=100") {
      assert.equal((init?.headers as Record<string, string>)?.Authorization, "Bearer polar_cst_owner");
      return Response.json({ items: grants.map(([, key]) => ({ id: key, key, status: "granted", created_at: freshTimestamp })) });
    }
    if (url.startsWith(ORDERS_PREFIX)) return ordersResponse(url);
    if (url.startsWith(GRANTS_PREFIX)) {
      return Response.json({ items: grants.map(([orderId, key]) => ({ is_granted: true, order_id: orderId, properties: { license_key_id: key } })) });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };
}

test("a Team buyer's later purchase reveals its key through the owner member's session", async () => {
  const sessionBodies: string[] = [];
  globalThis.fetch = teamCustomerFetch(() => Response.json({ items: [{ id: "mem_owner", role: "owner" }] }), sessionBodies);

  const state = await resolveCheckoutSuccessState("chk_team_then_dev", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });

  assert.equal(state?.licenseKey, "MEOW-DEV-OWNER");
  assert.equal(state?.customerPortalUrl, "https://polar.sh/portal/owner");
  assert.deepEqual(sessionBodies, [
    JSON.stringify({ customer_id: "cust_team_buyer" }),
    JSON.stringify({ customer_id: "cust_team_buyer", member_id: "mem_owner" })
  ]);
});

test("a Team buyer's later purchase reveals nothing when the key cannot list members", async () => {
  const sessionBodies: string[] = [];
  const originalError = console.error;
  console.error = () => {};
  try {
    globalThis.fetch = teamCustomerFetch(() => Response.json({ error: "insufficient_scope" }, { status: 403 }), sessionBodies);

    const state = await resolveCheckoutSuccessState("chk_team_then_dev", {
      activationTokenStore: createInMemoryActivationTokenStore(),
      cookieIssuedAt: Date.now()
    });

    assert.equal(state?.licenseKey, null);
    assert.equal(state?.customerPortalUrl, null);
    assert.equal(sessionBodies.length, 1, "no member-less retry");
  } finally {
    console.error = originalError;
  }
});

const OWNER_FOUND = () => Response.json({ items: [{ id: "mem_owner", role: "owner" }] });

test("invariant 1: the owner lookup runs only after the checkout passes every gate a non-team reveal needs", async () => {
  const cases: [string, TeamCustomerOptions, { cookieIssuedAt: number | null; store?: boolean }][] = [
    ["an unconfirmed checkout", { checkout: { status: "open" } }, { cookieIssuedAt: Date.now() }],
    ["an expired reveal window", { checkout: { created_at: secondsAgo(25 * 3600), modified_at: secondsAgo(25 * 3600) } }, { cookieIssuedAt: Date.now() }],
    ["a cookieless viewer after the first-visit grace", { checkout: { modified_at: secondsAgo(6 * 60) } }, { cookieIssuedAt: null }],
    ["a cookieless viewer with no store to claim the grace", {}, { cookieIssuedAt: null, store: false }],
    ["a checkout with no order of its own", { hasOrder: false }, { cookieIssuedAt: Date.now() }]
  ];
  for (const [label, options, viewer] of cases) {
    const requested: string[] = [];
    const sessionBodies: string[] = [];
    globalThis.fetch = teamCustomerFetch(OWNER_FOUND, sessionBodies, { ...options, requested });

    const state = await resolveCheckoutSuccessState("chk_team_then_dev", {
      activationTokenStore: viewer.store === false ? null : createInMemoryActivationTokenStore(),
      cookieIssuedAt: viewer.cookieIssuedAt
    });

    assert.equal(state?.licenseKey ?? null, null, label);
    assert.equal(state?.customerPortalUrl ?? null, null, label);
    assert.ok(!requested.includes(MEMBERS_URL), `${label}: no owner lookup`);
    assert.deepEqual(sessionBodies, [], `${label}: no customer session`);
  }
});

test("invariant 1: a second cookieless viewer of a team customer's checkout gets nothing once the grace is claimed", async () => {
  const store = createInMemoryActivationTokenStore();
  globalThis.fetch = teamCustomerFetch(OWNER_FOUND, []);

  const first = await resolveCheckoutSuccessState("chk_team_then_dev", { activationTokenStore: store, cookieIssuedAt: null });
  const second = await resolveCheckoutSuccessState("chk_team_then_dev", { activationTokenStore: store, cookieIssuedAt: null });

  assert.equal(first?.licenseKey, "MEOW-DEV-OWNER");
  assert.equal(second?.licenseKey, null);
  assert.equal(second?.activationToken, null);
  assert.equal(second?.customerPortalUrl, null);
  assert.equal(second?.revealBlockedReason, "cookie_required");
});

test("invariant 2: the owner member's session reveals only this checkout's grant, never another the owner can see", async () => {
  // The owner can also see their own Team seat key and an older Pro purchase.
  const foreign: [string, string][] = [["ord_team_seat", "MEOW-PRO-OWNERS-SEAT"], ["ord_older_pro", "MEOW-PRO-OLDER"]];
  globalThis.fetch = teamCustomerFetch(OWNER_FOUND, [], { grants: [...foreign, ["ord_chk_team_then_dev", "MEOW-DEV-OWNER"]] });
  const own = await resolveCheckoutSuccessState("chk_team_then_dev", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(own?.licenseKey, "MEOW-DEV-OWNER");

  globalThis.fetch = teamCustomerFetch(OWNER_FOUND, [], { grants: foreign });
  const none = await resolveCheckoutSuccessState("chk_team_then_dev", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });
  assert.equal(none?.licenseKey, null, "until this checkout's own grant exists, nothing is revealed");
});

test("invariant 3: only a positive numeric seat count takes the Team branch; anything else meets every gate", async () => {
  for (const seats of [null, 0, -1, "2", undefined]) {
    const requested: string[] = [];
    globalThis.fetch = teamCustomerFetch(OWNER_FOUND, [], {
      checkout: { seats, modified_at: secondsAgo(6 * 60) },
      requested
    });

    const state = await resolveCheckoutSuccessState("chk_team_then_dev", {
      activationTokenStore: createInMemoryActivationTokenStore(),
      cookieIssuedAt: null
    });

    assert.equal(state?.seats, undefined, `seats ${JSON.stringify(seats)} is not a Team checkout`);
    assert.equal(state?.revealBlockedReason, "cookie_required", `seats ${JSON.stringify(seats)} still meets the cookie gate`);
    assert.equal(state?.licenseKey, null);
  }
});

test("invariant 3: the Team branch returns no key, token or portal URL, even to a cookie holder", async () => {
  const requested: string[] = [];
  globalThis.fetch = teamCustomerFetch(OWNER_FOUND, [], { checkout: { seats: 3 }, requested });

  const state = await resolveCheckoutSuccessState("chk_team_then_dev", {
    activationTokenStore: createInMemoryActivationTokenStore(),
    cookieIssuedAt: Date.now()
  });

  assert.equal(state?.seats, 3);
  assert.equal(state?.licenseKey, null);
  assert.equal(state?.activationToken, null);
  assert.equal(state?.customerPortalUrl, null);
  assert.deepEqual(requested, ["https://sandbox-api.polar.sh/v1/checkouts/chk_team_then_dev"]);
});

test("a seat-based (Team) checkout reports its seats and looks up no key", async () => {
  const requestedUrls: string[] = [];
  const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
  globalThis.fetch = async (input) => {
    const url = input.toString();
    requestedUrls.push(url);
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_team") {
      return Response.json({
        status: "succeeded",
        customer_id: "cust_team",
        product_id: "prod_team_seats",
        seats: 4,
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_team", {
    activationTokenStore: createInMemoryActivationTokenStore()
  });

  assert.equal(state?.seats, 4);
  assert.equal(state?.licenseKey, null);
  assert.equal(state?.activationToken, null);
  assert.equal(state?.revealBlockedReason, null);
  assert.deepEqual(requestedUrls, ["https://sandbox-api.polar.sh/v1/checkouts/chk_team"],
    "no customer session, order or key lookup for a purchase whose keys belong to its members");
});
