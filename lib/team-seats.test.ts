import assert from "node:assert/strict";
import test from "node:test";
import { seatCount } from "./team-seats.ts";

test("seatCount returns whole seats within 2..100", () => {
  assert.equal(seatCount(5), 5);
  assert.equal(seatCount("12"), 12);
  assert.equal(seatCount(2.5), 2);
  assert.equal(seatCount(99.9), 99);
  assert.equal(seatCount(1), 2);
  assert.equal(seatCount(1000), 100);
  assert.equal(seatCount(-3), 2);
  assert.equal(seatCount("abc"), 2);
  assert.equal(seatCount(undefined), 2);
  assert.equal(seatCount(Infinity), 2);
});
