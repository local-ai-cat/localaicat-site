import assert from "node:assert/strict";
import test from "node:test";
import {
  activationTokenExpiresAt,
  hashActivationToken,
  inspectActivationToken,
  issueActivationToken,
  parseActivationToken
} from "./activation-tokens.ts";

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

test("issues inspectable activation tokens with an expiry", () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123");
  assert.ok(token);

  const inspection = inspectActivationToken(token);
  assert.equal(inspection.ok, true);
  if (inspection.ok) {
    assert.equal(inspection.payload.checkoutId, "chk_test_123");
    assert.equal(inspection.payload.customerId, "cust_test_123");
  }

  const expiresAt = activationTokenExpiresAt(token);
  assert.ok(expiresAt instanceof Date);
  assert.ok(expiresAt.getTime() > Date.now());
});

test("activation token hashes are deterministic and opaque", () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123");
  assert.ok(token);

  const firstHash = hashActivationToken(token);
  const secondHash = hashActivationToken(token);

  assert.equal(firstHash, secondHash);
  assert.notEqual(firstHash, token);
  assert.equal(firstHash.length, 64);
});

test("activation tokens expire cryptographically", async () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123", 1);
  assert.ok(token);

  await new Promise((resolve) => setTimeout(resolve, 1_100));

  const result = inspectActivationToken(token);
  assert.deepEqual(result, {
    ok: false,
    reason: "expired"
  });
});

test("tampered activation tokens are rejected", () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123");
  assert.ok(token);

  const tampered = `${token.slice(0, -2)}zz`;
  const result = inspectActivationToken(tampered);
  assert.deepEqual(result, {
    ok: false,
    reason: "invalid"
  });
});

test("activation tokens cannot be inspected with a different secret", () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123");
  assert.ok(token);

  configureSecret("different-secret");

  const result = inspectActivationToken(token);
  assert.deepEqual(result, {
    ok: false,
    reason: "invalid"
  });
});

test("activation tokens parse to stable payload fields", () => {
  const token = issueActivationToken("chk_test_123", "cust_test_123");
  assert.ok(token);

  const payload = parseActivationToken(token);
  assert.ok(payload);
  assert.equal(payload.checkoutId, "chk_test_123");
  assert.equal(payload.customerId, "cust_test_123");
  assert.equal(payload.v, 1);
  assert.ok(payload.jti.length > 0);
});
