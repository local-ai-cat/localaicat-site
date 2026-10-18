import assert from "node:assert/strict";
import test from "node:test";
import { EXIT_FAILED, EXIT_OK, EXIT_UNAVAILABLE, main, parseUrl, summarize } from "./billing-health.mjs";

const HEALTHY = {
  ok: true,
  checkedAt: "2026-10-18T00:00:00.000Z",
  checks: { redis: { ok: true, detail: "Upstash Redis answered PONG" } }
};

test("parseUrl defaults to production and accepts --url", () => {
  assert.equal(parseUrl([]), "https://localaicat.com/api/health/billing");
  assert.equal(parseUrl(["--url", "https://meow.localaicat.com/api/health/billing"]), "https://meow.localaicat.com/api/health/billing");
});

test("summarize passes a healthy report and lists failures first", () => {
  assert.equal(summarize(200, HEALTHY).code, EXIT_OK);
  const failing = summarize(503, {
    ok: false,
    checkedAt: "2026-10-18T00:00:00.000Z",
    checks: { redis: { ok: true, detail: "PONG" }, polar_admin_key: { ok: false, detail: "Polar answered 401" } }
  });
  assert.equal(failing.code, EXIT_FAILED);
  assert.deepEqual(failing.lines.slice(1), ["FAIL polar_admin_key: Polar answered 401", "ok   redis: PONG"]);
});

test("summarize passes a skipped check and labels it", () => {
  const skipped = summarize(200, {
    ok: true,
    checkedAt: "2026-10-18T00:00:00.000Z",
    checks: { "success_url_pro-annual": { ok: true, skipped: true, detail: "skipped: needs checkout_links:read" } }
  });
  assert.equal(skipped.code, EXIT_OK);
  assert.equal(skipped.lines[1], "skip success_url_pro-annual: skipped: needs checkout_links:read");
});

test("summarize treats a reply without a usable report as unavailable", () => {
  assert.equal(summarize(502, null).code, EXIT_UNAVAILABLE);
  assert.equal(summarize(500, HEALTHY).code, EXIT_UNAVAILABLE, "only 200 and 503 carry a report");
  assert.equal(summarize(200, { ok: true, checks: { redis: null } }).code, EXIT_UNAVAILABLE);
  assert.equal(summarize(200, { ok: true, checks: {} }).code, EXIT_UNAVAILABLE);
});

test("main sends the token as a bearer header and maps answers to exit codes", async () => {
  const quiet = { log: console.log, error: console.error };
  console.log = () => {};
  console.error = () => {};
  try {
    const seen = [];
    const answer = (status, body) => async (url, init) => {
      seen.push({ url, authorization: init.headers.Authorization });
      return Response.json(body, { status });
    };
    const env = { BILLING_HEALTH_TOKEN: "job-token" };

    assert.equal(await main([], env, answer(200, HEALTHY)), EXIT_OK);
    assert.deepEqual(seen[0], { url: "https://localaicat.com/api/health/billing", authorization: "Bearer job-token" });
    assert.equal(await main([], env, answer(503, { ...HEALTHY, ok: false })), EXIT_FAILED);
    assert.equal(await main([], env, answer(401, { error: "Unauthorized." })), EXIT_UNAVAILABLE);
    assert.equal(await main([], env, async () => { throw new Error("offline"); }), EXIT_UNAVAILABLE);
  } finally {
    console.log = quiet.log;
    console.error = quiet.error;
  }
});
