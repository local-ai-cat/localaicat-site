import assert from "node:assert/strict";
import test from "node:test";
import { endOfDay, firstPending, knownShares, knownUpTo, onPace } from "./stats-forecast.ts";

test("a bucket's known share runs from 0 at its start to 1 at its end", () => {
  const shares = knownShares(["2026-09", "2026-10", "2026-11"], endOfDay("2026-10-30"));
  assert.equal(shares[0], 1);
  assert.equal(shares[1], 30 / 31);
  assert.equal(shares[2], 0);
  assert.deepEqual(knownShares(["2026-10-31", "2026-11-01"], Date.parse("2026-11-01T06:00:00Z")), [1, 0.25]);
  assert.equal(firstPending([1, 1, 30 / 31, 0]), 2);
  assert.equal(firstPending([1, 1]), 2);
  assert.equal(knownUpTo([1, 1, 0.25]), 1.25);
  assert.equal(knownUpTo([1, 1]), 1);
  assert.equal(knownUpTo([0, 0]), 0);
});

test("an empty new month is drawn at the last 30 days' pace, not at zero", () => {
  // October known through the 30th: 60 downloads in 30 of its 31 days, so 2 a day.
  const shares = [1, 30 / 31, 0];
  const pace = onPace([45, 60, 0], shares, "month");
  assert.equal(pace[0], 45);
  // Every window is a month long: October's 30 known days plus the last 31st of September.
  const lastMonth = 60 + 45 / 31;
  assert.ok(Math.abs(pace[1] - (60 + lastMonth / 31)) < 1e-9);
  assert.ok(Math.abs(pace[2] - lastMonth) < 1e-9);
});

test("the pace converges on the real count as the bucket fills in", () => {
  assert.equal(onPace([30, 40], [1, 1], "month")[1], 40);
  const halfway = onPace([30, 20], [1, 0.5], "month")[1];
  // Half of November in (20), the other half at the trailing month's pace: 20 own + 15 from October's half.
  assert.ok(Math.abs(halfway - (20 + 0.5 * (20 + 15))) < 1e-9);
});

test("days are paced over the last week, and a range with nothing known stays as it is", () => {
  const days = onPace([7, 7, 7, 7, 7, 7, 14, 0], [1, 1, 1, 1, 1, 1, 1, 0], "day");
  assert.equal(days[7], 8);
  assert.deepEqual(onPace([0, 0], [0, 0], "day"), [0, 0]);
});
