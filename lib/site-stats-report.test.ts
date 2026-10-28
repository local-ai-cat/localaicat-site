import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, dailyVisits, loadStatsReport, releaseChannel, summariseReleases } from "./site-stats-report.ts";
import { MemoryStatsStore, recordDownload, recordUpdateCheck } from "./site-stats.ts";

const DAYS = ["2026-10-27", "2026-10-28"];

test("tags name their channel the way the release workflows write them", () => {
  assert.equal(releaseChannel("v1.4.0"), "stable");
  assert.equal(releaseChannel("v1.4.0-480"), "stable");
  assert.equal(releaseChannel("v1.4.0-b17"), "beta");
  assert.equal(releaseChannel("v1.4.0-a256"), "alpha");
});

test("GitHub history counts DMGs only, skips drafts and lists the busiest stable releases", () => {
  const history = summariseReleases([
    { tag_name: "v1.4.0", published_at: "2026-07-09T12:07:28Z", assets: [
      { name: "appcast.xml", download_count: 900 },
      { name: "LocalAIChatDirect.dmg", download_count: 27 },
      { name: "LocalAIChatDirect-1.4.0.dmg", download_count: 6 }] },
    { tag_name: "v1.4.0-480", published_at: "2026-10-09T12:00:48Z", assets: [{ name: "LocalAIChatDirect.dmg", download_count: 11 }] },
    { tag_name: "v1.4.0-b17", assets: [{ name: "LocalAIChatDirect-1.4.0-b17.dmg", download_count: 2 }] },
    { tag_name: "v1.4.0-a256", assets: [{ name: "LocalAIChatDirect-1.4.0-a256.dmg", download_count: 5 }] },
    { tag_name: "v9.9.9", draft: true, assets: [{ name: "x.dmg", download_count: 99 }] },
    { tag_name: "v1.0.0", assets: [{ name: "x.dmg", download_count: -1 }, { name: "y.dmg", download_count: "7" }] },
    null
  ]);
  assert.deepEqual(history.channels, [
    { channel: "stable", releases: 3, dmgDownloads: 44 },
    { channel: "beta", releases: 1, dmgDownloads: 2 },
    { channel: "alpha", releases: 1, dmgDownloads: 5 }
  ]);
  assert.deepEqual(history.topStable.map(release => [release.tag, release.dmgDownloads]), [["v1.4.0", 33], ["v1.4.0-480", 11], ["v1.0.0", 0]]);
  assert.equal(history.topStable[0].publishedAt, "2026-07-09");
});

test("GoatCounter's daily totals fill the window, with missing days as zero", () => {
  const payload = { total: 9, total_utc: 9, stats: [{ day: "2026-10-28", daily: 7, hourly: [] }, { day: "2026-10-01", daily: 2 }] };
  assert.deepEqual(dailyVisits(payload, DAYS), [{ day: "2026-10-27", value: 0 }, { day: "2026-10-28", value: 7 }]);
  assert.equal(dailyVisits({ total: 1 }, DAYS), null);
  assert.equal(dailyVisits("nope", DAYS), null);
});

test("the report splits downloads by channel per day and totals them by version", () => {
  const report = buildReport({
    days: DAYS,
    storage: "redis",
    downloads: { "2026-10-27": { "stable|1.4.0": 3 }, "2026-10-28": { "stable|1.4.0": 1, "beta|1.4.0-b17": 2 } },
    macs: { "2026-10-27": { "1.4.0": 4 }, "2026-10-28": { "1.4.0": 5, "1.4.0-b17": 1 } },
    checkouts: { "2026-10-27": {}, "2026-10-28": { "pro-annual": 1, purrdain: 2 } },
    visits: null,
    github: null
  });
  assert.deepEqual(report.downloads, [
    { day: "2026-10-27", stable: 3, beta: 0 }, { day: "2026-10-28", stable: 1, beta: 2 }
  ]);
  assert.deepEqual(report.downloadsByVersion, [
    { channel: "stable", version: "1.4.0", count: 4 }, { channel: "beta", version: "1.4.0-b17", count: 2 }
  ]);
  assert.deepEqual(report.macsToday, [{ version: "1.4.0", macs: 5 }, { version: "1.4.0-b17", macs: 1 }]);
  assert.deepEqual(report.macsByDay, [{ day: "2026-10-27", value: 4 }, { day: "2026-10-28", value: 6 }]);
  assert.deepEqual(report.checkoutsByPlan, [{ plan: "purrdain", count: 2 }, { plan: "pro-annual", count: 1 }]);
});

test("without a store the report says counting is off instead of showing zeros", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    const report = await loadStatsReport(Date.parse("2026-10-28T12:00:00Z"), null);
    assert.equal(report.storage, "off");
    assert.equal(report.downloads, null);
    assert.equal(report.macsByDay, null);
    assert.equal(report.github, null);
    assert.equal(report.days.length, 30);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a store's counts reach the report", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  const now = Date.parse("2026-10-28T12:00:00Z");
  const store = new MemoryStatsStore();
  await recordDownload(store, "stable", "1.4.0", now);
  await recordUpdateCheck(store, "1.4.0", { ip: "203.0.113.7", userAgent: "Local AI Chat/1.4.0 Sparkle/2.6.4" }, now);
  try {
    const report = await loadStatsReport(now, store);
    assert.equal(report.storage, "memory");
    assert.deepEqual(report.downloads?.at(-1), { day: "2026-10-28", stable: 1, beta: 0 });
    assert.deepEqual(report.macsToday, [{ version: "1.4.0", macs: 1 }]);
  } finally {
    globalThis.fetch = realFetch;
  }
});
