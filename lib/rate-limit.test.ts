import assert from "node:assert/strict";
import test from "node:test";
import { callerAddress, checkRateLimit, type RateLimitCounter } from "./rate-limit.ts";

function memoryCounter(): RateLimitCounter {
  const counts = new Map<string, number>();
  return async (key) => { const next = (counts.get(key) ?? 0) + 1; counts.set(key, next); return next; };
}

test("Polar object creation permits its quota then blocks per caller", async () => {
  const counter = memoryCounter();
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await checkRateLimit("checkout", "a", 3, 60, 10, counter));
  assert.deepEqual(results, ["allowed", "allowed", "allowed", "limited"]);
  assert.equal(await checkRateLimit("checkout", "b", 3, 60, 10, counter), "allowed");
});

test("rotating IPs cannot exceed the shared creation ceiling", async () => {
  const counter = memoryCounter();
  for (let i = 0; i < 5; i++) assert.equal(await checkRateLimit("team-checkout", `ip-${i}`, 10, 60, 5, counter), "allowed");
  assert.equal(await checkRateLimit("team-checkout", "new-ip", 10, 60, 5, counter), "limited");
  assert.equal(await checkRateLimit("checkout", "new-ip", 10, 60, 5, counter), "allowed", "read/reveal quota is separate");
});

test("missing, failed, or malformed quota storage fails closed", async () => {
  assert.equal(await checkRateLimit("checkout", "a", 10, 60, 60, null), "unavailable");
  assert.equal(await checkRateLimit("checkout", "a", 10, 60, 60, async () => { throw new Error("offline"); }), "unavailable");
  for (const count of [NaN, 0, -1, 1.2]) assert.equal(await checkRateLimit("checkout", "a", 10, 60, 60, async () => count), "unavailable");
  let calls = 0;
  assert.equal(await checkRateLimit("checkout", "a", 10, 60, 60, async () => { if (++calls > 1) throw new Error("global failed"); return 1; }), "unavailable");
});

test("callerAddress prefers trusted x-real-ip", () => {
  assert.equal(callerAddress(new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" })), "203.0.113.7");
  assert.equal(callerAddress(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "198.51.100.1");
  assert.equal(callerAddress(new Headers()), "unknown");
});
