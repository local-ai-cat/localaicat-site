import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { GET } from "../app/api/checkout/[id]/route.ts";
import { middleware } from "../middleware.ts";
import { buyerSessionCookieName } from "./polar-buyer-session.ts";
import { mintRevealCookieValue, revealCookieName, verifyRevealCookieValue } from "./reveal-cookie.ts";

const checkoutId = "chk_buyer_retry";
const validProof = "polar_cst_verified_buyer_fixture_12345";
const badProof = "polar_cst_wrong_customer_fixture_12345";
const fixtureEnv = {
  ACTIVATION_TOKEN_SECRET: "fixture-only-cookie-key",
  POLAR_ADMIN_KEY: "fixture-only-polar-key",
  POLAR_API_BASE_URL: "https://polar.example.test",
  KV_REST_API_URL: "https://redis.example.test",
  KV_REST_API_TOKEN: "fixture-only-redis-key"
};

function apiRequest(cookie: string): NextRequest {
  return new NextRequest(`https://localaicat.com/api/checkout/${checkoutId}`, { headers: { cookie } });
}

// Exercise the real HTTP route with local provider/Redis fixtures: no network.
test("rejected proof is cleared so a genuine buyer redirect can retry immediately", async () => {
  const originalEnv = Object.fromEntries(Object.keys(fixtureEnv).map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, fixtureEnv);
  let claims = 0;
  let proofChecks = 0;
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    if (url.startsWith(fixtureEnv.KV_REST_API_URL)) {
      const body = JSON.parse(String(init?.body)) as unknown[];
      function commandResult(command: unknown[]): { result: number | string } {
        if (command[0] === "eval") return { result: 1 };
        assert.equal(command[0], "set");
        assert.match(String(command[1]), /^reveal-grace-buyer-v2:/);
        claims += 1;
        return { result: "OK" };
      }
      const result = Array.isArray(body[0]) ? body.map((row) => commandResult(row as unknown[])) : commandResult(body);
      return Response.json(result);
    }
    if (url.endsWith(`/v1/checkouts/${checkoutId}`)) {
      const now = new Date().toISOString();
      return Response.json({ status: "confirmed", customer_id: "cust_buyer", created_at: now, modified_at: now });
    }
    if (url.endsWith("/v1/customer-portal/customers/me")) {
      proofChecks += 1;
      const supplied = new Headers(init?.headers).get("authorization");
      return Response.json({ id: supplied === `Bearer ${validProof}` ? "cust_buyer" : "cust_other" });
    }
    if (url.includes("/v1/orders/?")) return Response.json({ items: [] });
    throw new Error(`Unexpected fixture request: ${url}`);
  };
  try {
    const rejected = await GET(apiRequest(`${buyerSessionCookieName(checkoutId)}=${badProof}`), { params: Promise.resolve({ id: checkoutId }) });
    assert.equal(rejected.status, 403);
    assert.equal(claims, 0, "an unrelated proof cannot spend the buyer's first reveal");
    const deletion = rejected.cookies.get(buyerSessionCookieName(checkoutId));
    assert.equal(deletion?.value, "");
    assert.equal(deletion?.maxAge, 0);
    assert.equal(deletion?.secure, true);
    assert.equal(deletion?.httpOnly, true);
    assert.equal(deletion?.path, "/");
    assert.equal(rejected.cookies.get(revealCookieName(checkoutId)), undefined);

    // Browser applies the deletion, then revisits the genuine provider redirect.
    const captured = await middleware(new NextRequest(`https://localaicat.com/success?checkout_id=${checkoutId}&customer_session_token=${validProof}`));
    assert.equal(captured.cookies.get(buyerSessionCookieName(checkoutId))?.value, validProof);
    const accepted = await GET(apiRequest(`${buyerSessionCookieName(checkoutId)}=${validProof}`), { params: Promise.resolve({ id: checkoutId }) });
    assert.equal(accepted.status, 404, "buyer verified while the purchased license is still propagating");
    assert.equal(claims, 1);
    const reveal = accepted.cookies.get(revealCookieName(checkoutId))?.value;
    assert.ok(verifyRevealCookieValue(checkoutId, reveal));
    assert.equal(accepted.cookies.get(buyerSessionCookieName(checkoutId))?.maxAge, 0);

    const verifiedCookie = mintRevealCookieValue(checkoutId);
    const priorProofChecks = proofChecks;
    const reload = await GET(apiRequest(`${revealCookieName(checkoutId)}=${verifiedCookie}; ${buyerSessionCookieName(checkoutId)}=${badProof}`), { params: Promise.resolve({ id: checkoutId }) });
    assert.equal(reload.status, 404);
    assert.equal(proofChecks, priorProofChecks, "a verified reveal cookie does not depend on subsequent provider proof");
    assert.equal(reload.cookies.get(revealCookieName(checkoutId)), undefined, "existing verified reveal remains intact");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
