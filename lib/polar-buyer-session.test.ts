import assert from "node:assert/strict";
import test from "node:test";
import { buyerRedirect, buyerSessionCookieName } from "./polar-buyer-session.ts";

const token = "polar_cst_buyer_session_fixture_1234";
test("Polar redirect is cleaned and credential is scoped to the checkout cookie", () => {
  const incoming = buyerRedirect(new URL(`https://localaicat.com/success?checkout_id=chk_1&customer_session_token=${token}&email=private@example.test#secret`));
  assert.ok(incoming);
  assert.equal(incoming.cleanUrl.href, "https://localaicat.com/success?checkout_id=chk_1");
  assert.equal(incoming.token, token);
  assert.notEqual(buyerSessionCookieName("chk_1"), buyerSessionCookieName("chk_2"));
  assert.ok(buyerSessionCookieName("chk_1").startsWith("__Host-"));
});

test("malformed and ambiguous redirect proof is discarded, never forwarded", () => {
  for (const query of [
    `checkout_id=../bad&customer_session_token=${token}`,
    `checkout_id=chk_1&checkout_id=chk_2&customer_session_token=${token}`,
    `checkout_id=chk_1&customer_session_token=${token}&customer_session_token=${token}`,
    "checkout_id=chk_1&customer_session_token=invalid",
    `checkout_id=chk_1&customer_session_token=polar_cst_${"x".repeat(10000)}`
  ]) {
    const result = buyerRedirect(new URL(`https://localaicat.com/success?${query}`));
    assert.ok(result);
    assert.equal(result.token, null);
    assert.ok(!result.cleanUrl.href.includes("customer_session_token"));
  }
  assert.equal(buyerRedirect(new URL("https://localaicat.com/success?checkout_id=chk_1")), null);
  assert.equal(buyerRedirect(new URL(`https://localaicat.com/?customer_session_token=${token}`)), null);
});
