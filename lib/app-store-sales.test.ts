import assert from "node:assert/strict";
import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  LOCAL_AI_CHAT_APP_ID,
  LOCAL_AI_CHAT_SKU,
  APP_STORE_DAILY_DAYS,
  appStorePeriods,
  appStoreToken,
  appStoreUnits,
  emptyAppStoreDay,
  fillAppStoreHistory,
  latestAppStoreDay,
  readAppStoreHistory,
  summariseSalesReport,
  type AppStoreSalesConfig
} from "./app-store-sales.ts";
import { MemoryStatsStore } from "./site-stats.ts";

const HEADER = ["Provider", "SKU", "Title", "Product Type Identifier", "Units", "Developer Proceeds", "Apple Identifier",
  "Parent Identifier", "Device"].join("\t");

function row(type: string, units: number, appId: string, device: string, parent = ""): string {
  return ["APPLE", "sku", "title", type, String(units), "9.99", appId, parent, device].join("\t");
}

const OTHER_APP = "6756835707";
const REPORT = [
  HEADER,
  row("1F", 3, LOCAL_AI_CHAT_APP_ID, "iPhone"),
  row("1F", 1, LOCAL_AI_CHAT_APP_ID, "iPad"),
  row("1F", 2, LOCAL_AI_CHAT_APP_ID, "Desktop"),
  row("F1", 1, LOCAL_AI_CHAT_APP_ID, "Desktop"),
  row("1F", -1, LOCAL_AI_CHAT_APP_ID, "iPhone"),
  row("3F", 4, LOCAL_AI_CHAT_APP_ID, "iPhone"),
  row("7F", 9, LOCAL_AI_CHAT_APP_ID, "iPad"),
  row("IAY", 2, "6800000001", "iPhone", LOCAL_AI_CHAT_SKU),
  row("IA1", 5, "6800000002", "iPhone", "com.atlas.gitfocus"),
  row("1F", 50, OTHER_APP, "iPhone"),
  row("1F", Number.NaN, LOCAL_AI_CHAT_APP_ID, "iPhone"),
  ""
].join("\n");

test("a daily summary keeps only Local AI Chat's units, split by iPhone and iPad against Mac", () => {
  assert.deepEqual(summariseSalesReport(REPORT), { ios: 3, mac: 3, redownloads: 4, updates: 9, purchases: 2 });
});

test("a report without the expected columns is not a summary, so it is never stored as zero", () => {
  assert.equal(summariseSalesReport("not\ta\treport\n1\t2\t3"), null);
  assert.equal(summariseSalesReport(""), null);
  assert.deepEqual(summariseSalesReport(HEADER), emptyAppStoreDay(), "a real report with no rows is a day of zero");
});

function testConfig(): AppStoreSalesConfig {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    keyId: "TESTKEY123",
    issuerId: "0ad00d02-8e06-47b4-8ba2-0d65f6edf914",
    vendorNumber: "81234567",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  };
}

test("the bearer token is an ES256 JWT Apple can verify, valid for ten minutes", () => {
  const config = testConfig();
  const now = Date.parse("2026-10-28T12:00:00Z");
  const [header, claims, signature] = appStoreToken(config, now).split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "ES256", kid: "TESTKEY123", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(claims, "base64url").toString()), {
    iss: config.issuerId, iat: now / 1000, exp: now / 1000 + 600, aud: "appstoreconnect-v1"
  });
  const signed = Buffer.from(signature, "base64url");
  assert.equal(signed.length, 64, "raw r||s, not DER");
  const verified = createVerify("SHA256").update(`${header}.${claims}`)
    .verify({ key: createPublicKey(config.privateKey), dsaEncoding: "ieee-p1363" }, signed);
  assert.equal(verified, true);
});

const NOW = Date.parse("2026-10-28T12:00:00Z");

test("history is every finished month since launch, then the last 90 days but today", () => {
  const periods = appStorePeriods(NOW);
  const months = periods.filter(period => period.length === 7);
  const days = periods.filter(period => period.length === 10);
  assert.equal(months[0], "2025-02");
  assert.equal(months.at(-1), "2026-09", "this month is still running");
  assert.equal(months.length, 20);
  assert.equal(days.length, APP_STORE_DAILY_DAYS);
  assert.equal(days.at(-1), "2026-10-27", "today is never asked");
});

/** Apple stand-in: answers by report date, and records what was asked. */
function fakeApple(answers: Record<string, () => Response>): { asked: string[]; restore: () => void } {
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const period = url.searchParams.get("filter[reportDate]") ?? "";
    asked.push(period);
    assert.equal(url.searchParams.get("filter[vendorNumber]"), "81234567");
    assert.equal(url.searchParams.get("filter[frequency]"), period.length === 7 ? "MONTHLY" : "DAILY");
    assert.match(String((init?.headers as Record<string, string>).Authorization), /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    return (answers[period] ?? (() => Response.json({ errors: [{ status: "404" }] }, { status: 404 })))();
  };
  return { asked, restore: () => { globalThis.fetch = realFetch; } };
}

test("a fill stores each settled period for good and asks again only what isn't settled", async () => {
  const apple = fakeApple({
    "2025-03": () => new Response(gzipSync(REPORT), { status: 200 }),
    "2026-10-20": () => new Response(gzipSync(REPORT), { status: 200 }),
    "2026-10-21": () => new Response("server error", { status: 500 })
  });
  const store = new MemoryStatsStore();
  const config = testConfig();
  try {
    const saved = await fillAppStoreHistory(config, store, NOW);
    const periods = appStorePeriods(NOW);
    // One fill asks every period; the one that fails is asked again with the older report version.
    assert.equal(apple.asked.length, periods.length + 1, "the whole backfill fits in one fill");
    // Not stored: a failed call, and the three days Apple may not have published yet (2026-10-25 to -27).
    assert.equal(saved, periods.length - 4);
    const history = await readAppStoreHistory(store, NOW);
    assert.deepEqual(history["2025-03"], { ios: 3, mac: 3, redownloads: 4, updates: 9, purchases: 2 });
    assert.deepEqual(history["2026-10-20"], { ios: 3, mac: 3, redownloads: 4, updates: 9, purchases: 2 });
    assert.deepEqual(history["2025-02"], emptyAppStoreDay(), "a long-past month with no report had no units");
    assert.equal("2026-10-21" in history, false);
    assert.equal("2026-10-27" in history, false);
    assert.equal(latestAppStoreDay(history), "2026-10-24");

    apple.asked.length = 0;
    // A finished fill lets the next one start straight away.
    await fillAppStoreHistory(config, store, NOW);
    assert.deepEqual(apple.asked.sort(), ["2026-10-21", "2026-10-21", "2026-10-25", "2026-10-26", "2026-10-27"]);
  } finally {
    apple.restore();
  }
});

test("only one fill runs at a time", async () => {
  const apple = fakeApple({});
  const store = new MemoryStatsStore();
  try {
    const lease = await store.claim("app-store-fill", 300);
    assert.ok(lease);
    assert.equal(await fillAppStoreHistory(testConfig(), store, NOW), 0);
    assert.equal(apple.asked.length, 0);
  } finally {
    apple.restore();
  }
});

test("a lease that has been replaced cannot free the new holder's lock", async () => {
  const store = new MemoryStatsStore();
  const first = await store.claim("app-store-fill", 300);
  assert.ok(first);
  await store.release("app-store-fill", first);
  const second = await store.claim("app-store-fill", 300);
  assert.ok(second);
  await store.release("app-store-fill", first);
  assert.equal(await store.claim("app-store-fill", 300), null, "the old lease let go of nothing");
});

test("a failed write doesn't stop the fill, and the lock is let go only once every write is done", async () => {
  const apple = fakeApple({});
  const store = new MemoryStatsStore();
  const realSave = store.saveHistory.bind(store);
  let writing = 0;
  let writingAtRelease = -1;
  store.saveHistory = async (kind, key, value, options) => {
    writing += 1;
    await new Promise(resolve => setTimeout(resolve, key === "2025-02" ? 1 : 5));
    writing -= 1;
    if (key === "2025-02") throw new Error("redis hiccup");
    return realSave(kind, key, value, options);
  };
  const realRelease = store.release.bind(store);
  store.release = async (name, lease) => { writingAtRelease = writing; return realRelease(name, lease); };
  try {
    const saved = await fillAppStoreHistory(testConfig(), store, NOW);
    assert.equal(writingAtRelease, 0);
    const history = await readAppStoreHistory(store, NOW);
    assert.equal("2025-02" in history, false);
    assert.deepEqual(history["2025-03"], emptyAppStoreDay());
    assert.equal(saved, Object.keys(history).length);
  } finally {
    apple.restore();
  }
});

test("a month just ended without a report is asked again, not stored as zero", async () => {
  const apple = fakeApple({});
  const store = new MemoryStatsStore();
  const earlyNovember = Date.parse("2026-11-03T12:00:00Z");
  try {
    await fillAppStoreHistory(testConfig(), store, earlyNovember);
    const history = await readAppStoreHistory(store, earlyNovember);
    assert.equal("2026-10" in history, false, "Apple publishes a month in the first days of the next");
    assert.deepEqual(history["2026-09"], emptyAppStoreDay());
  } finally {
    apple.restore();
  }
});

test("a month is Apple's monthly report when there is one, else the sum of its stored days", () => {
  const unit = (ios: number) => ({ ios, mac: 1, redownloads: 0, updates: 0, purchases: 0 });
  const history = { "2026-09": unit(40), "2026-09-01": unit(1), "2026-10-01": unit(2), "2026-10-02": unit(3) };
  assert.equal(appStoreUnits(history, { key: "2026-09", days: ["2026-09-01"] })?.ios, 40);
  assert.deepEqual(appStoreUnits(history, { key: "2026-10", days: ["2026-10-01", "2026-10-02", "2026-10-03"] }),
    { ios: 5, mac: 2, redownloads: 0, updates: 0, purchases: 0 });
  assert.equal(appStoreUnits(history, { key: "2026-08", days: ["2026-08-01"] }), null);
  assert.equal(appStoreUnits(history, { key: "2026-10-03", days: ["2026-10-03"] }), null);
});

test("no key or no store means no fill; a key that can't sign asks nothing", async () => {
  const apple = fakeApple({});
  try {
    assert.equal(await fillAppStoreHistory(null, new MemoryStatsStore(), NOW), 0);
    assert.equal(await fillAppStoreHistory(testConfig(), null, NOW), 0);
    assert.equal(await fillAppStoreHistory({ ...testConfig(), privateKey: "not a key" }, new MemoryStatsStore(), NOW), 0);
    assert.equal(apple.asked.length, 0);
  } finally {
    apple.restore();
  }
});

test("a monthly report refused at version 1_1 is asked again at 1_0", async () => {
  const realFetch = globalThis.fetch;
  const versions: string[] = [];
  const warn = console.warn;
  const warned: string[] = [];
  console.warn = (message: string) => { warned.push(message); };
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const version = url.searchParams.get("filter[version]") ?? "";
    if (url.searchParams.get("filter[reportDate]") === "2026-09") versions.push(version);
    if (version === "1_1" && url.searchParams.get("filter[frequency]") === "MONTHLY") {
      return Response.json({ errors: [{ code: "PARAMETER_ERROR.INVALID", title: "A parameter has an invalid value" }] }, { status: 400 });
    }
    return new Response(gzipSync(REPORT), { status: 200 });
  };
  const store = new MemoryStatsStore();
  try {
    await fillAppStoreHistory(testConfig(), store, NOW);
    assert.deepEqual(versions, ["1_1", "1_0"]);
    assert.deepEqual((await readAppStoreHistory(store, NOW))["2026-09"], { ios: 3, mac: 3, redownloads: 4, updates: 9, purchases: 2 });
    assert.ok(warned.some(line => line === "[stats] App Store MONTHLY 2026-09 v1_1: 400 PARAMETER_ERROR.INVALID A parameter has an invalid value"));
    assert.equal(warned.some(line => /BEGIN|Bearer|eyJ/.test(line)), false, "no key or token in the logs");
  } finally {
    globalThis.fetch = realFetch;
    console.warn = warn;
  }
});
