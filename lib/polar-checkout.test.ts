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

  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    requestedUrls.push(url);
    const headers = init?.headers as Record<string, string> | undefined;

    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_123") {
      assert.equal(headers?.Authorization, "Bearer polar_oat_test");
      return Response.json({
        status: "confirmed",
        customer_id: "cust_123"
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
    license_key: "LOCALAI-PRO-CURRENT"
  });
});

test("resolveCheckoutSuccessState redacts the license key after the reveal window expires", async () => {
  // Anyone with the unauthenticated /success?checkout_id=… URL can fetch the
  // license key today. To bound the blast radius of a leaked URL we expose
  // the key only for a short window after the checkout is confirmed.
  const store = createInMemoryActivationTokenStore();
  const staleTimestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h old, > 30m gate

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_old") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_old",
        created_at: staleTimestamp,
        modified_at: staleTimestamp
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
            created_at: staleTimestamp
          }
        ]
      });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const state = await resolveCheckoutSuccessState("chk_old", {
    activationTokenStore: store,
    viewerHasRevealCookie: true
  });

  assert.equal(state?.checkoutStatus, "confirmed");
  assert.equal(state?.customerId, "cust_old", "customer id may still surface for portal links");
  assert.equal(state?.licenseKey, null, "license key must be hidden once the reveal window passes");
  assert.equal(state?.activationToken, null, "no token should be minted for stale checkouts");
  assert.equal(state?.revealBlockedReason, "expired");
});

test("resolveCheckoutSuccessState refuses to reveal the key without the per-browser cookie", async () => {
  // Even within the time window, a viewer who lacks the per-checkout
  // reveal cookie (i.e. someone who received a forwarded URL) must not see
  // the license key. Only the original browser that landed first qualifies.
  const store = createInMemoryActivationTokenStore();
  const freshTimestamp = new Date(Date.now() - 60 * 1000).toISOString(); // 60s old

  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url === "https://sandbox-api.polar.sh/v1/checkouts/chk_fresh") {
      return Response.json({
        status: "confirmed",
        customer_id: "cust_fresh",
        created_at: freshTimestamp,
        modified_at: freshTimestamp
      });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-sessions") {
      return Response.json({
        token: "polar_cst_fresh",
        customer_portal_url: "https://polar.sh/portal/session"
      }, { status: 201 });
    }
    if (url === "https://sandbox-api.polar.sh/v1/customer-portal/license-keys?limit=20") {
      return Response.json({
        items: [
          {
            key: "MEOW-PRO-FRESH",
            status: "granted",
            created_at: freshTimestamp
          }
        ]
      });
    }
    return Response.json({ error: "unexpected request" }, { status: 500 });
  };

  const stateForOuterViewer = await resolveCheckoutSuccessState("chk_fresh", {
    activationTokenStore: store,
    viewerHasRevealCookie: false
  });

  assert.equal(stateForOuterViewer?.licenseKey, null, "key must be hidden for viewers without the cookie");
  assert.equal(stateForOuterViewer?.revealBlockedReason, "cookie_required");
  assert.ok(stateForOuterViewer?.revealExpiresAt, "client should still see a countdown so it can prompt the legit viewer");
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
    viewerHasRevealCookie: true
  });

  assert.equal(state?.licenseKey, "MEOW-PRO-OK");
  assert.equal(state?.revealBlockedReason, null);
  assert.ok(state?.revealExpiresAt);
});
