import assert from "node:assert/strict";
import test from "node:test";
import {
  mintRevealCookieValue,
  revealCookieName,
  verifyRevealCookieValue
} from "./reveal-cookie.ts";

const originalEnv = {
  ACTIVATION_TOKEN_SECRET: process.env.ACTIVATION_TOKEN_SECRET
};

test.beforeEach(() => {
  process.env.ACTIVATION_TOKEN_SECRET = "test-reveal-secret-A";
});

test.after(() => {
  if (originalEnv.ACTIVATION_TOKEN_SECRET === undefined) {
    delete process.env.ACTIVATION_TOKEN_SECRET;
  } else {
    process.env.ACTIVATION_TOKEN_SECRET = originalEnv.ACTIVATION_TOKEN_SECRET;
  }
});

test("revealCookieName is stable per checkout id", () => {
  assert.equal(revealCookieName("chk_abc"), revealCookieName("chk_abc"));
  assert.notEqual(revealCookieName("chk_abc"), revealCookieName("chk_xyz"));
});

test("minted cookie roundtrips through verify", () => {
  const value = mintRevealCookieValue("chk_abc");
  const payload = verifyRevealCookieValue("chk_abc", value);
  assert.ok(payload, "valid cookie must verify");
  assert.ok(payload!.issuedAt > 0);
});

test("forged cookie value '1' is rejected", () => {
  // The earlier implementation set the cookie to the literal string "1".
  // Anyone who knew the (public) cookie name could forge that. Verifier
  // must reject anything that isn't a properly signed payload.
  assert.equal(verifyRevealCookieValue("chk_abc", "1"), null);
});

test("cookies signed for one checkout do not validate for another", () => {
  const value = mintRevealCookieValue("chk_abc");
  assert.equal(verifyRevealCookieValue("chk_xyz", value), null);
});

test("cookies signed under a different secret are rejected", () => {
  const value = mintRevealCookieValue("chk_abc");
  process.env.ACTIVATION_TOKEN_SECRET = "different-secret";
  assert.equal(verifyRevealCookieValue("chk_abc", value), null);
});

test("tampered timestamp invalidates the signature", () => {
  const value = mintRevealCookieValue("chk_abc");
  const dot = value.indexOf(".");
  const tampered = `${Number(value.slice(0, dot)) - 1000}.${value.slice(dot + 1)}`;
  assert.equal(verifyRevealCookieValue("chk_abc", tampered), null);
});
