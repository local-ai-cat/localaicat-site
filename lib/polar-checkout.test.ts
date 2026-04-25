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
