import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_APP_VERSIONS_PER_DAY,
  MemoryStatsStore,
  OTHER_VERSION,
  afterResponse,
  hashCounts,
  isLikelyBot,
  recordCheckout,
  recordDownload,
  recordUpdateCheck,
  sparkleAppVersion,
  statsDay,
  statsDays,
  statsRequest,
  versionLabel,
  type SiteStatsStore
} from "./site-stats.ts";

const NOW = Date.parse("2026-10-28T23:30:00Z");

test("days are UTC and listed oldest first", () => {
  assert.equal(statsDay(NOW), "2026-10-28");
  assert.deepEqual(statsDays(NOW, 3), ["2026-10-26", "2026-10-27", "2026-10-28"]);
});

test("Sparkle's user agent gives the app's display version; anything else is not an update check", () => {
  assert.equal(sparkleAppVersion("Local AI Chat/1.4.0 Sparkle/2.6.4"), "1.4.0");
  assert.equal(sparkleAppVersion("Local AI Chat/1.4.0-b17 Sparkle/2.7.0"), "1.4.0-b17");
  assert.equal(sparkleAppVersion("Local AI Chat/?? Sparkle/2.7.0"), "unknown");
  assert.equal(sparkleAppVersion("Mozilla/5.0 (Macintosh) Safari/605.1.15"), null);
  assert.equal(sparkleAppVersion(null), null);
});

test("field labels never carry separators or arbitrary text into Redis", () => {
  assert.equal(versionLabel("1.4.0"), "1.4.0");
  for (const value of ["", null, "1.4.0|beta", "a:b", "x".repeat(40), "../etc", " 1.4.0"]) {
    assert.equal(versionLabel(value), "unknown", String(value));
  }
});

test("link previews and crawlers are not downloads; people and curl are", () => {
  assert.equal(isLikelyBot(null), true);
  assert.equal(isLikelyBot("Slackbot-LinkExpanding 1.0"), true);
  assert.equal(isLikelyBot("facebookexternalhit/1.1"), true);
  assert.equal(isLikelyBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15"), false);
  assert.equal(isLikelyBot("curl/8.7.1"), false);
});

test("downloads and checkouts are counted per day and label", async () => {
  const store = new MemoryStatsStore();
  await recordDownload(store, "stable", "1.4.0", NOW);
  await recordDownload(store, "stable", "1.4.0", NOW);
  await recordDownload(store, "beta", null, NOW);
  await recordCheckout(store, "pro-annual", NOW);
  assert.deepEqual(await store.counts("downloads", ["2026-10-28"]), {
    "2026-10-28": { "stable|1.4.0": 2, "beta|unknown": 1 }
  });
  assert.deepEqual(await store.counts("checkouts", ["2026-10-27", "2026-10-28"]), {
    "2026-10-27": {}, "2026-10-28": { "pro-annual": 1 }
  });
});

// Two Macs on the same version behind one address count as one: a known undercount of a hash-only design.
test("a Mac checking every hour is one Mac a day, counted under its version", async () => {
  const store = new MemoryStatsStore();
  const mac = { ip: "203.0.113.7", userAgent: "Local AI Chat/1.4.0 Sparkle/2.6.4" };
  for (let hour = 0; hour < 5; hour += 1) await recordUpdateCheck(store, "1.4.0", mac, NOW - hour * 3_600_000);
  await recordUpdateCheck(store, "1.4.0-b17", { ...mac, userAgent: "Local AI Chat/1.4.0-b17 Sparkle/2.6.4" }, NOW);
  assert.deepEqual(await store.macs(["2026-10-28"]), { "2026-10-28": { "1.4.0": 1, "1.4.0-b17": 1 } });
  assert.deepEqual(await store.counts("update-checks", ["2026-10-28"]), { "2026-10-28": { "1.4.0": 5, "1.4.0-b17": 1 } });
});

test("what is kept for a Mac is a salted hash, never its address", async () => {
  const members: string[] = [];
  const store = new MemoryStatsStore();
  store.addMac = async (_day, _version, member) => { members.push(member); };
  await recordUpdateCheck(store, "1.4.0", { ip: "203.0.113.7", userAgent: "Local AI Chat/1.4.0 Sparkle/2.6.4" }, NOW);
  assert.equal(members.length, 1);
  assert.match(members[0], /^[0-9a-f]{32}$/);
  assert.equal(members[0].includes("203.0.113.7"), false);
});

test("a failing store never throws into the redirect", async () => {
  const broken = new MemoryStatsStore() as SiteStatsStore;
  broken.increment = async () => { throw new Error("redis down"); };
  broken.daySalt = async () => { throw new Error("redis down"); };
  const warn = console.warn;
  console.warn = () => {};
  try {
    await recordDownload(broken, "stable", "1.4.0", NOW);
    await recordCheckout(broken, "pro-monthly", NOW);
    await recordUpdateCheck(broken, "1.4.0", { ip: "x", userAgent: "y" }, NOW);
    await recordDownload(null, "stable", "1.4.0", NOW);
  } finally {
    console.warn = warn;
  }
});

test("HGETALL's raw flat answer and the object form read the same", () => {
  assert.deepEqual(hashCounts(["stable|1.4.0", "3", "beta|1.4.0-b17", "1"]), { "stable|1.4.0": 3, "beta|1.4.0-b17": 1 });
  assert.deepEqual(hashCounts({ "stable|1.4.0": "3" }), { "stable|1.4.0": 3 });
  assert.deepEqual(hashCounts(["odd"]), {});
  assert.deepEqual(hashCounts(null), {});
});

test("a client cannot mint versions: odd ones are unknown, and past the day's cap they are other", async () => {
  assert.equal(sparkleAppVersion("Local AI Chat/1.4.0junk Sparkle/2.6.4"), "unknown");
  assert.equal(sparkleAppVersion("Local AI Chat/1.4.0-a256 Sparkle/2.6.4"), "1.4.0-a256");
  const store = new MemoryStatsStore();
  for (let patch = 0; patch < MAX_APP_VERSIONS_PER_DAY + 5; patch += 1) {
    await recordUpdateCheck(store, `9.9.${patch}`, { ip: `198.51.100.${patch}`, userAgent: "ua" }, NOW);
  }
  await recordUpdateCheck(store, "9.9.0", { ip: "198.51.100.200", userAgent: "ua" }, NOW);
  const macs = (await store.macs(["2026-10-28"]))["2026-10-28"];
  assert.equal(Object.keys(macs).length, MAX_APP_VERSIONS_PER_DAY + 1);
  assert.equal(macs[OTHER_VERSION], 5);
  assert.equal(macs["9.9.0"], 2, "a version admitted earlier in the day keeps counting under its own name");
});

test("counting after the response swallows its own failures, even outside a request", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    let ran = false;
    afterResponse(async () => { ran = true; throw new Error("boom"); });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ran, true);
  } finally {
    console.warn = warn;
  }
});

test("the caller is Vercel's x-real-ip, not a spoofable forwarded list", () => {
  const headers = new Headers({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "10.0.0.1, 198.51.100.1", "user-agent": "ua" });
  assert.deepEqual(statsRequest(headers), { ip: "198.51.100.1", userAgent: "ua" });
});
