import assert from "node:assert/strict";
import test from "node:test";
import {
  createInMemoryActivationTokenStore,
  issuePersistentActivationToken
} from "./activation-token-store.ts";
import { redeemActivationToken } from "./activation-redeem.ts";
import { getActivationTokenStatus } from "./activation-status.ts";

function configureSecret(value = "test-activation-secret") {
  const previous = process.env.ACTIVATION_TOKEN_SECRET;
  process.env.ACTIVATION_TOKEN_SECRET = value;
  return () => {
    if (previous === undefined) {
      delete process.env.ACTIVATION_TOKEN_SECRET;
    } else {
      process.env.ACTIVATION_TOKEN_SECRET = previous;
    }
  };
}

test("getActivationTokenStatus returns pending before redemption", async () => {
  const restoreSecret = configureSecret();
  const store = createInMemoryActivationTokenStore();

  try {
    const issued = await issuePersistentActivationToken({
      checkoutId: "chk_pending",
      customerId: "cus_pending",
      licenseKey: "lk_pending"
    }, store);

    assert.ok(issued);
    const response = await getActivationTokenStatus(issued.token, { store });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      status: "pending",
      expires_at: issued.expiresAt.toISOString()
    });
  } finally {
    restoreSecret();
  }
});

test("getActivationTokenStatus returns claimed after redemption", async () => {
  const restoreSecret = configureSecret();
  const store = createInMemoryActivationTokenStore();

  try {
    const issued = await issuePersistentActivationToken({
      checkoutId: "chk_claimed",
      customerId: "cus_claimed",
      licenseKey: "lk_claimed"
    }, store);

    assert.ok(issued);
    const redeemed = await redeemActivationToken(issued.token, { store });
    assert.equal(redeemed.status, 200);

    const status = await getActivationTokenStatus(issued.token, { store });
    assert.equal(status.status, 200);
    assert.deepEqual(status.body, { status: "claimed" });
  } finally {
    restoreSecret();
  }
});

test("getActivationTokenStatus returns expired for expired durable tokens", async () => {
  const restoreSecret = configureSecret();
  const store = createInMemoryActivationTokenStore();

  try {
    const issued = await issuePersistentActivationToken({
      checkoutId: "chk_expired_status",
      customerId: "cus_expired_status",
      licenseKey: "lk_expired_status",
      ttlSeconds: 1
    }, store);

    assert.ok(issued);
    const status = await getActivationTokenStatus(issued.token, {
      store,
      now: new Date(issued.expiresAt.getTime() + 1000)
    });

    assert.equal(status.status, 410);
    assert.deepEqual(status.body, { status: "expired" });
  } finally {
    restoreSecret();
  }
});

test("getActivationTokenStatus returns invalid for unknown unexpired tokens", async () => {
  const restoreSecret = configureSecret();
  const issuingStore = createInMemoryActivationTokenStore();
  const emptyStore = createInMemoryActivationTokenStore();

  try {
    const issued = await issuePersistentActivationToken({
      checkoutId: "chk_missing_status",
      customerId: "cus_missing_status",
      licenseKey: "lk_missing_status"
    }, issuingStore);

    assert.ok(issued);
    const status = await getActivationTokenStatus(issued.token, { store: emptyStore });

    assert.equal(status.status, 404);
    assert.deepEqual(status.body, { status: "invalid" });
  } finally {
    restoreSecret();
  }
});
