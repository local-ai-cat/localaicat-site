import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { middleware } from "../middleware.ts";
import { buyerSessionCookieName } from "./polar-buyer-session.ts";

const token = "polar_cst_buyer_session_fixture_1234";

test("middleware captures buyer proof in a secure cookie and redirects before rendering", async () => {
  const response = await middleware(new NextRequest(`https://localaicat.com/success?checkout_id=chk_1&customer_session_token=${token}&email=private@example.test`));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://localaicat.com/success?checkout_id=chk_1");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const cookie = response.cookies.get(buyerSessionCookieName("chk_1"));
  assert.equal(cookie?.value, token);
  assert.equal(cookie?.httpOnly, true);
  assert.equal(cookie?.secure, true);
  assert.equal(cookie?.sameSite, "lax");
  assert.equal(cookie?.path, "/");
  assert.equal(cookie?.maxAge, 300);
  assert.equal(await response.text(), "");
});

test("middleware discards invalid proof and never overwrites a checkout's existing proof", async () => {
  const invalid = await middleware(new NextRequest("https://localaicat.com/success?checkout_id=chk_1&customer_session_token=invalid"));
  assert.equal(invalid.status, 303);
  assert.equal(invalid.headers.get("set-cookie"), null);
  assert.ok(!invalid.headers.get("location")?.includes("customer_session_token"));
  const existing = await middleware(new NextRequest(`https://localaicat.com/success?checkout_id=chk_1&customer_session_token=${token}`, {
    headers: { cookie: `${buyerSessionCookieName("chk_1")}=polar_cst_existing_fixture_12345` }
  }));
  assert.equal(existing.headers.get("set-cookie"), null);
});

test("success and retired activation pages always suppress caching and referrers", async () => {
  for (const path of ["/success?checkout_id=chk_1", "/activate?t=old-token"]) {
    const response = await middleware(new NextRequest(`https://localaicat.com${path}`));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }
});

test("buyer redirect handling does not bypass internal authentication", async () => {
  const original = process.env.INTERNAL_PASSWORD;
  process.env.INTERNAL_PASSWORD = "test-internal-secret";
  try {
    const denied = await middleware(new NextRequest(`https://localaicat.com/internal/?customer_session_token=${token}`));
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get("set-cookie"), null);
    const allowed = await middleware(new NextRequest("https://localaicat.com/internal/", {
      headers: { authorization: `Basic ${Buffer.from("user:test-internal-secret").toString("base64")}` }
    }));
    assert.equal(allowed.status, 200);
  } finally {
    if (original === undefined) delete process.env.INTERNAL_PASSWORD;
    else process.env.INTERNAL_PASSWORD = original;
  }
});
