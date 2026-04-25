import assert from "node:assert/strict";
import test from "node:test";
import {
  createInMemoryActivationTokenStore,
  issuePersistentActivationToken
} from "./activation-token-store.ts";
import { hashActivationToken } from "./activation-tokens.ts";

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

test("issuePersistentActivationToken stores a redeemable durable record", async () => {
  const store = createInMemoryActivationTokenStore();
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_store",
      customerId: "cust_store",
      licenseKey: "SD-PRO-STORE"
    },
    store
  );
  assert.ok(issued);

  const consumed = await store.consume(hashActivationToken(issued.token));
  assert.equal(consumed.status, "consumed");
  if (consumed.status === "consumed") {
    assert.equal(consumed.record.checkoutId, "chk_store");
    assert.equal(consumed.record.customerId, "cust_store");
    assert.equal(consumed.record.licenseKey, "SD-PRO-STORE");
  }
});

test("consume returns used after the durable token has been claimed", async () => {
  const store = createInMemoryActivationTokenStore();
  const issued = await issuePersistentActivationToken(
    {
      checkoutId: "chk_used",
      customerId: "cust_used",
      licenseKey: "SD-PRO-USED"
    },
    store
  );
  assert.ok(issued);

  const tokenHash = hashActivationToken(issued.token);
  assert.equal((await store.consume(tokenHash)).status, "consumed");
  assert.equal((await store.consume(tokenHash)).status, "used");
});

test("consume returns expired for an expired durable token", async () => {
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

  const tokenHash = hashActivationToken(issued.token);
  assert.equal((await store.consume(tokenHash)).status, "expired");
});
