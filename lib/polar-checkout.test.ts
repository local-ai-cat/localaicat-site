import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryActivationTokenStore } from "./activation-token-store.ts";
import { redeemActivationToken } from "./activation-redeem.ts";
import { resolveCheckoutSuccessState } from "./polar-checkout.ts";

const originalFetch = globalThis.fetch;
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

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      assert.equal(headers?.Authorization, "Bearer polar_cst_test");
      return Response.json({
        items: [
          {
            key: "LOCALAI-PRO-OLDER",
            status: "granted",
            created_at: "2026-04-25T10:00:00Z"
          },
          {
            key: "LOCALAI-PRO-CURRENT",
            status: "granted",
            created_at: "2026-04-25T11:00:00Z"
          }
        ]
      });
    }

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

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
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

    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
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
            recurring_interval: "year",
            current_period_end: renewsAt,
            cancel_at_period_end: false,
            status: "active"
          }
        ]
      });
    }

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
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
            key: "MEOW-PRO-LEAKED",
            status: "granted",
            created_at: staleCreated
          }
        ]
      });
    }
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
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
            key: "MEOW-PRO-POST",
            status: "granted",
            created_at: postGraceTimestamp
          }
        ]
      });
    }
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
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
            key: "MEOW-PRO-JUSTNOW",
            status: "granted",
            created_at: justNowTimestamp
          }
        ]
      });
    }
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
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
            key: "MEOW-PRO-OK",
            status: "granted",
            created_at: freshTimestamp
          }
        ]
      });
    }
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
