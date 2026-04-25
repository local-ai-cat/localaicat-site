import assert from "node:assert/strict";
import test from "node:test";
import {
  createInMemoryActivationTokenStore,
  issuePersistentActivationToken
} from "./activation-token-store.ts";
import { redeemActivationToken } from "./activation-redeem.ts";

const originalSecret = process.env.ACTIVATION_TOKEN_SECRET;

function configureSecret(value = "test-activation-secret") {
  process.env.ACTIVATION_TOKEN_SECRET = value;
  delete process.env.POLAR_ADMIN_KEY;
}

test.beforeEach(() => {
  configureSecret();
});

test.after(() => {
  if (originalSecret) {
    process.env.ACTIVATION_TOKEN_SECRET = originalSecret;
  } else {
    delete process.env.ACTIVATION_TOKEN_SECRET;
  }
});

test("redeemActivationToken returns the license key for a valid token", async () => {
  const store = createInMemoryActivationTokenStore();
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_valid",
      customerId: "cust_valid",
      licenseKey: "SD-PRO-VALID"
    },
    store
  );
  assert.ok(issued);

  const response = await redeemActivationToken(issued.token, { store });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    checkout_id: "chk_valid",
    customer_id: "cust_valid",
    license_key: "SD-PRO-VALID"
  });
});

test("redeemActivationToken rejects replay after first use", async () => {
  const store = createInMemoryActivationTokenStore();
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_once",
      customerId: "cust_once",
      licenseKey: "SD-PRO-ONCE"
    },
    store
  );
  assert.ok(issued);

  const first = await redeemActivationToken(issued.token, { store });
  const second = await redeemActivationToken(issued.token, { store });

  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.deepEqual(second.body, {
    error: "Activation token has already been used.",
    code: "activation_token_used"
  });
});

test("redeemActivationToken rejects expired tokens", async () => {
  const store = createInMemoryActivationTokenStore();
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_expired",
      customerId: "cust_expired",
      licenseKey: "SD-PRO-EXPIRED",
      ttlSeconds: 1
    },
    store
  );
  assert.ok(issued);

  await new Promise((resolve) => setTimeout(resolve, 1_100));

  const response = await redeemActivationToken(issued.token, { store });
  assert.equal(response.status, 410);
  assert.deepEqual(response.body, {
    error: "Activation token expired.",
    code: "activation_token_expired"
  });
});

test("redeemActivationToken rejects tokens not found in durable storage", async () => {
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_missing",
      customerId: "cust_missing",
      licenseKey: "SD-PRO-MISSING"
    },
    createInMemoryActivationTokenStore()
  );
  assert.ok(issued);

  const response = await redeemActivationToken(issued.token, {
    store: createInMemoryActivationTokenStore()
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Activation token is invalid.",
    code: "activation_token_invalid"
  });
});

test("issuePersistentActivationToken returns null without a store", async () => {
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_none",
      customerId: "cust_none",
      licenseKey: "SD-PRO-NONE"
    },
    null
  );

  assert.equal(issued, null);
});
