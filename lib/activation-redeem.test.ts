import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryActivationTokenStore, issuePersistentActivationToken } from "./activation-token-store.ts";
import { redeemActivationToken } from "./activation-redeem.ts";

test("even a valid previously-issued token cannot redeem a permanent key", async () => {
  const previous = process.env.ACTIVATION_TOKEN_SECRET;
  process.env.ACTIVATION_TOKEN_SECRET = "test-only-secret";
  try {
    const store = createInMemoryActivationTokenStore();
    const issued = await issuePersistentActivationToken({ checkoutId: "chk_old", customerId: "cust_old", licenseKey: "SECRET-KEY" }, store);
    assert.ok(issued);
    for (const token of [issued.token, "invalid", ""]) {
      const result = await redeemActivationToken(token, { store });
      assert.equal(result.status, 410);
      assert.equal(result.body.code, "manual_activation_required");
      assert.ok(!JSON.stringify(result).includes("SECRET-KEY"));
    }
  } finally {
    if (previous === undefined) delete process.env.ACTIVATION_TOKEN_SECRET;
    else process.env.ACTIVATION_TOKEN_SECRET = previous;
  }
});
