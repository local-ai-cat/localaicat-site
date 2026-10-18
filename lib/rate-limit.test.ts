import assert from "node:assert/strict";
import test from "node:test";
import { callerAddress, isRateLimited, type RateLimitCounter } from "./rate-limit.ts";

function memoryCounter(): RateLimitCounter {
  const counts = new Map<string, number>();
  return async (key) => {
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next;
  };
}

test("isRateLimited allows up to the limit per caller, then blocks", async () => {
  const counter = memoryCounter();
  const results = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    results.push(await isRateLimited("checkout", "203.0.113.7", 3, 60, counter));
  }
  assert.deepEqual(results, [false, false, false, true]);
  assert.equal(await isRateLimited("checkout", "198.51.100.1", 3, 60, counter), false, "other callers have their own budget");
});

test("isRateLimited lets requests through without a store or when the store fails", async () => {
  assert.equal(await isRateLimited("checkout", "203.0.113.7", 0, 60, null), false);
  const failing: RateLimitCounter = async () => { throw new Error("redis down"); };
  assert.equal(await isRateLimited("checkout", "203.0.113.7", 0, 60, failing), false);
});

test("callerAddress prefers x-real-ip, then the first x-forwarded-for hop", () => {
  assert.equal(callerAddress(new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" })), "203.0.113.7");
  assert.equal(callerAddress(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "198.51.100.1");
  assert.equal(callerAddress(new Headers()), "unknown");
});
