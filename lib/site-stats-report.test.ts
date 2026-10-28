import assert from "node:assert/strict";
import test from "node:test";
import {
  REPORT_CACHE_MS,
  buildReport,
  cachedStatsReport,
  dailyVisits,
  directPerDay,
  githubTotals,
  loadStatsReport,
  releaseChannel,
  summariseOrders,
  summariseReleases,
  type GitHubHistory,
  type StatsReport
} from "./site-stats-report.ts";
import { MemoryStatsStore, recordDownload, recordUpdateCheck } from "./site-stats.ts";
import { rangeBuckets, type StatsRange } from "./stats-range.ts";

const NOW = Date.parse("2026-10-28T12:00:00Z");

test("tags name their channel the way the release workflows write them", () => {
  assert.equal(releaseChannel("v1.4.0"), "stable");
  assert.equal(releaseChannel("v1.4.0-480"), "stable");
  assert.equal(releaseChannel("v1.4.0-b17"), "beta");
  assert.equal(releaseChannel("v1.4.0-a256"), "alpha");
});

test("GitHub history counts DMGs only, splits new installs from updates and lists the busiest stable releases", () => {
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
  assert.equal(history.newDownloads, 38, "the plain DMG is a new install");
  assert.equal(history.updateDownloads, 6, "a versioned stable DMG is mostly Sparkle updating");
  assert.deepEqual(githubTotals(history), { new: 38, updates: 6, beta: 2, alpha: 5 });
  assert.deepEqual(history.topStable.map(release => [release.tag, release.dmgDownloads]), [["v1.4.0", 33], ["v1.4.0-480", 11], ["v1.0.0", 0]]);
  assert.equal(history.topStable[0].publishedAt, "2026-07-09");
  assert.equal(history.firstRelease, "2026-07-09");
});

test("GoatCounter's daily totals are read by day", () => {
  const payload = { total: 9, total_utc: 9, stats: [{ day: "2026-10-28", daily: 7, hourly: [] }, { day: "2026-10-01", daily: 2 }] };
  assert.deepEqual([...(dailyVisits(payload) ?? [])], [["2026-10-28", 7], ["2026-10-01", 2]]);
  assert.equal(dailyVisits({ total: 1 }), null);
  assert.equal(dailyVisits("nope"), null);
});

test("direct downloads per day come from the totals written down each day", () => {
  const totals = (fresh: number) => JSON.stringify({ new: fresh, updates: 0, beta: 0, alpha: 0 });
  const snapshots = { "2026-10-25": totals(80), "2026-10-26": totals(83), "2026-10-27": totals(81), "2026-10-28": totals(81) };
  const perDay = directPerDay(snapshots, ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"], "2026-10-28",
    { new: 86, updates: 0, beta: 0, alpha: 0 });
  assert.equal(perDay.has("2026-10-24"), false, "no totals that day");
  assert.equal(perDay.get("2026-10-25"), 3);
  assert.equal(perDay.get("2026-10-26"), 0, "a re-uploaded file restarts its count; never below zero");
  assert.equal(perDay.get("2026-10-27"), 0);
  assert.equal(perDay.get("2026-10-28"), 5, "today: the live total minus this morning's");
  assert.equal(directPerDay({ "2026-10-28": "{bad" }, ["2026-10-28"], "2026-10-28", null).size, 0);
});

const GITHUB: GitHubHistory = {
  channels: [{ channel: "stable", releases: 2, dmgDownloads: 171 }, { channel: "beta", releases: 1, dmgDownloads: 28 }, { channel: "alpha", releases: 3, dmgDownloads: 9 }],
  topStable: [],
  newDownloads: 86,
  updateDownloads: 85,
  firstRelease: "2026-03-31"
};

function emptyInput(range: StatsRange): Parameters<typeof buildReport>[0] {
  return {
    range: rangeBuckets(range, NOW), now: NOW, storage: "redis", downloads: null, macs: null, checkouts: null,
    visits: null, github: null, snapshots: null, appStore: null, orders: null
  };
}

test("a day range splits site download buttons by channel per day and totals them by version", () => {
  const report = buildReport({
    ...emptyInput("7d"),
    downloads: { "2026-10-27": { "stable|1.4.0": 3 }, "2026-10-28": { "stable|1.4.0": 1, "beta|1.4.0-b17": 2 } },
    macs: { "2026-10-27": { "1.4.0": 4 }, "2026-10-28": { "1.4.0": 5, "1.4.0-b17": 1 } },
    checkouts: { "2026-10-28": { "pro-annual": 1, purrdain: 2 } }
  });
  assert.equal(report.granularity, "day");
  assert.equal(report.buckets.length, 7);
  assert.deepEqual(report.siteClicks?.slice(-2), [
    { key: "2026-10-27", stable: 3, beta: 0 }, { key: "2026-10-28", stable: 1, beta: 2 }
  ]);
  assert.deepEqual(report.downloadsByVersion, [
    { channel: "stable", version: "1.4.0", count: 4 }, { channel: "beta", version: "1.4.0-b17", count: 2 }
  ]);
  assert.deepEqual(report.macsToday, [{ version: "1.4.0", macs: 5 }, { version: "1.4.0-b17", macs: 1 }]);
  assert.deepEqual(report.macs?.slice(-2), [{ key: "2026-10-27", value: 4 }, { key: "2026-10-28", value: 6 }]);
  assert.deepEqual(report.checkoutsByPlan, [{ plan: "purrdain", count: 2 }, { plan: "pro-annual", count: 1 }]);
});

test("a month range sums days into months, and shows a month's busiest day for Macs", () => {
  const report = buildReport({
    ...emptyInput("12m"),
    macs: { "2026-10-27": { "1.4.0": 4 }, "2026-10-28": { "1.4.0": 5, "1.4.0-b17": 1 } },
    visits: new Map([["2026-10-27", 10], ["2026-10-28", 7], ["2026-09-30", 3]])
  });
  assert.equal(report.granularity, "month");
  assert.deepEqual([report.buckets[0], report.buckets.at(-1)], ["2025-11", "2026-10"]);
  assert.deepEqual(report.visits?.slice(-2), [{ key: "2026-09", value: 3 }, { key: "2026-10", value: 17 }]);
  assert.deepEqual(report.macs?.at(-1), { key: "2026-10", value: 6 });
});

test("downloads join the App Store and direct; all time adds Apple's history since launch to GitHub's totals", () => {
  const unit = (ios: number, mac: number) => ({ ios, mac, redownloads: 1, updates: 0, purchases: 0 });
  const report = buildReport({
    ...emptyInput("30d"),
    github: GITHUB,
    snapshots: { "2026-10-28": JSON.stringify({ new: 84, updates: 85, beta: 28, alpha: 9 }) },
    appStore: { "2025-02": unit(10, 2), "2026-09": unit(20, 5), "2026-10-27": unit(2, 1), "2026-10-26": unit(1, 0) }
  });
  assert.deepEqual(report.downloads.at(-2), { key: "2026-10-27", ios: 2, mac: 1, direct: null });
  assert.deepEqual(report.downloads.at(-1), { key: "2026-10-28", ios: 0, mac: 0, direct: 2 });
  assert.deepEqual(report.appStore?.units, { ios: 3, mac: 1, redownloads: 2, updates: 0, purchases: 0 });
  assert.equal(report.appStore?.latestDay, "2026-10-27");
  assert.equal(report.direct, 2);
  // App Store: Feb 2025 (12) + Sep 2026 (25) + October so far, from its days (4); direct: GitHub's plain DMG (86).
  assert.deepEqual(report.allTime, { downloads: 127, appStore: 41, direct: 86, directUpdates: 85 });

  const year = buildReport({ ...emptyInput("12m"), github: GITHUB, snapshots: null });
  assert.equal(year.direct, 86, "a range reaching back to the first direct release holds all of GitHub's total");
  assert.equal(year.downloads.every(bucket => bucket.direct === null), true, "but no month has its own count before the snapshots");
});

test("without a store the report says counting is off, and nothing is scheduled", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  let scheduled = 0;
  try {
    const report = await loadStatsReport("30d", NOW, { store: null, appStoreConfig: null, schedule: () => { scheduled += 1; } });
    assert.equal(report.storage, "off");
    assert.equal(report.siteClicks, null);
    assert.equal(report.macs, null);
    assert.equal(report.github, null);
    assert.equal(report.appStore, null);
    assert.deepEqual(report.allTime, { downloads: null, appStore: null, direct: null, directUpdates: null });
    assert.equal(report.buckets.length, 30);
    assert.equal(scheduled, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the public page gathers at most once per five minutes per range, and visits in between share it", async () => {
  const loads: string[] = [];
  const load = async (range: StatsRange, now: number): Promise<StatsReport> => {
    loads.push(range);
    return buildReport({ ...emptyInput(range), now });
  };
  const start = NOW + 1_000_000_007;
  const first = await cachedStatsReport("7d", start, load);
  const again = await Promise.all([cachedStatsReport("7d", start + 1_000, load), cachedStatsReport("7d", start + REPORT_CACHE_MS - 1, load)]);
  assert.deepEqual(again, [first, first]);
  await cachedStatsReport("all", start + 1_000, load);
  assert.deepEqual(loads, ["7d", "all"], "each range keeps its own report");
  await cachedStatsReport("7d", start + REPORT_CACHE_MS, load);
  assert.deepEqual(loads, ["7d", "all", "7d"]);
});

test("what the public page is given holds totals only, never a visitor", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  const store = new MemoryStatsStore();
  const ip = "203.0.113.77";
  const userAgent = "Local AI Chat/1.4.0 Sparkle/2.6.4 (secret-marker)";
  await recordUpdateCheck(store, "1.4.0", { ip, userAgent }, NOW);
  await recordDownload(store, "stable", "1.4.0", NOW);
  try {
    for (const range of ["30d", "all"] as const) {
      const shown = JSON.stringify(await loadStatsReport(range, NOW, { store, appStoreConfig: null, schedule: () => undefined }));
      assert.equal(shown.includes(ip), false);
      assert.equal(shown.includes("secret-marker"), false);
      assert.equal(/[0-9a-f]{32}/.test(shown), false, "no visitor hash");
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a store's counts reach the report, and the day's GitHub totals are written down once after it", async () => {
  const realFetch = globalThis.fetch;
  // GitHub totals are written down from 2026-10-29, so this day is after it.
  const today = Date.parse("2026-10-30T12:00:00Z");
  const release = { tag_name: "v1.4.0", assets: [{ name: "LocalAIChatDirect.dmg", download_count: 86 }] };
  let released = 86;
  globalThis.fetch = async (input: string | URL | Request) => String(input).startsWith("https://api.github.com/")
    ? Response.json([{ ...release, assets: [{ name: "LocalAIChatDirect.dmg", download_count: released }] }])
    : new Response("unavailable", { status: 503 });
  const store = new MemoryStatsStore();
  await recordDownload(store, "stable", "1.4.0", today);
  await recordUpdateCheck(store, "1.4.0", { ip: "203.0.113.7", userAgent: "Local AI Chat/1.4.0 Sparkle/2.6.4" }, today);
  const work: (() => Promise<void>)[] = [];
  const deps = { store, appStoreConfig: null, schedule: (job: () => Promise<void>) => { work.push(job); } };
  try {
    const report = await loadStatsReport("7d", today, deps);
    assert.equal(report.storage, "memory");
    assert.deepEqual(report.siteClicks?.at(-1), { key: "2026-10-30", stable: 1, beta: 0 });
    assert.deepEqual(report.macsToday, [{ version: "1.4.0", macs: 1 }]);
    assert.equal(report.direct, null, "no totals written down yet");
    assert.equal(work.length, 1);
    await work[0]();
    assert.deepEqual(await store.history("github-totals", ["2026-10-30"]), { "2026-10-30": JSON.stringify({ new: 86, updates: 0, beta: 0, alpha: 0 }) });

    released = 90;
    const later = await loadStatsReport("7d", today + 60_000, deps);
    assert.equal(later.direct, 4, "four plain-DMG downloads since this morning's totals");
    await work[1]();
    assert.equal(JSON.parse((await store.history("github-totals", ["2026-10-30"]))["2026-10-30"]).new, 86, "the day's first totals stay");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("orders are counted, never priced: paid first orders, free ones and renewals apart", () => {
  const orders = summariseOrders([
    { paid: true, billing_reason: "purchase", total_amount: 4900, customer: { email: "x@example.com" } },
    { paid: true, billing_reason: "subscription_create", total_amount: 0 },
    { paid: true, billing_reason: "subscription_create", total_amount: 900 },
    { paid: true, billing_reason: "subscription_cycle", total_amount: 900 },
    { paid: false, billing_reason: "purchase", total_amount: 4900 },
    { paid: true, billing_reason: "subscription_update", total_amount: 300 },
    null
  ]);
  assert.deepEqual(orders, { newPaid: 2, newFree: 1, renewals: 1 });
});
