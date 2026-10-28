import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_RANGE, addMonths, daysOfMonth, monthsBetween, niceTicks, parseRange, rangeBuckets } from "./stats-range.ts";

const NOW = Date.parse("2026-10-28T12:00:00Z");

test("only the listed ranges are accepted; anything else is the default", () => {
  assert.equal(parseRange("90d"), "90d");
  assert.equal(parseRange("all"), "all");
  assert.equal(parseRange(["7d"]), DEFAULT_RANGE);
  assert.equal(parseRange("1d; drop"), DEFAULT_RANGE);
  assert.equal(parseRange(undefined), "all");
});

test("months count across years and list in order", () => {
  assert.equal(addMonths("2025-12", 1), "2026-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.deepEqual(monthsBetween("2025-11", "2026-02"), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.equal(daysOfMonth("2028-02", "2030-01-01").length, 29);
  assert.deepEqual(daysOfMonth("2026-10", "2026-10-02"), ["2026-10-01", "2026-10-02"]);
});

test("short ranges are days ending today; long ones are months", () => {
  const week = rangeBuckets("7d", NOW);
  assert.equal(week.granularity, "day");
  assert.deepEqual([week.buckets[0].key, week.buckets.at(-1)?.key], ["2026-10-22", "2026-10-28"]);
  assert.equal(rangeBuckets("90d", NOW).days.length, 90);

  const year = rangeBuckets("12m", NOW);
  assert.equal(year.granularity, "month");
  assert.equal(year.buckets.length, 12);
  assert.deepEqual(year.buckets.at(-1), { key: "2026-10", days: daysOfMonth("2026-10", "2026-10-28") });

  const all = rangeBuckets("all", NOW);
  assert.equal(all.buckets[0].key, "2025-02");
  assert.equal(all.buckets.length, 21);
  assert.equal(all.days[0], "2025-02-01");
  assert.equal(all.days.at(-1), "2026-10-28");
});

test("the y axis climbs in round steps to just above the tallest point", () => {
  assert.deepEqual(niceTicks(4), [0, 2, 4]);
  assert.deepEqual(niceTicks(71), [0, 50, 100]);
  assert.deepEqual(niceTicks(42), [0, 20, 40, 60]);
  assert.deepEqual(niceTicks(1), [0, 1]);
  assert.deepEqual(niceTicks(0), [0, 1]);
  assert.deepEqual(niceTicks(1135), [0, 500, 1000, 1500]);
});
