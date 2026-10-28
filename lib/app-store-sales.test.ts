import assert from "node:assert/strict";
import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  LOCAL_AI_CHAT_APP_ID,
  LOCAL_AI_CHAT_SKU,
  appStoreToken,
  emptyAppStoreDay,
  loadAppStoreDays,
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

test("a report without the expected columns counts nothing", () => {
  assert.deepEqual(summariseSalesReport("not\ta\treport\n1\t2\t3"), emptyAppStoreDay());
  assert.deepEqual(summariseSalesReport(""), emptyAppStoreDay());
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

test("the bearer token is an ES256 JWT Apple can verify, valid for five minutes", () => {
  const config = testConfig();
  const now = Date.parse("2026-10-28T12:00:00Z");
  const [header, claims, signature] = appStoreToken(config, now).split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "ES256", kid: "TESTKEY123", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(claims, "base64url").toString()), {
    iss: config.issuerId, iat: now / 1000, exp: now / 1000 + 300, aud: "appstoreconnect-v1"
  });
  const signed = Buffer.from(signature, "base64url");
  assert.equal(signed.length, 64, "raw r||s, not DER");
  const verified = createVerify("SHA256").update(`${header}.${claims}`)
    .verify({ key: createPublicKey(config.privateKey), dsaEncoding: "ieee-p1363" }, signed);
  assert.equal(verified, true);
});

test("without a key there is no App Store section", async () => {
  assert.equal(await loadAppStoreDays(null, ["2026-10-27"], Date.now(), null), null);
});

test("past days are asked of Apple once and stored; recent days without a report are asked again", async () => {
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  const now = Date.parse("2026-10-28T12:00:00Z");
  const days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-26", "2026-10-27", "2026-10-28"];
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const day = url.searchParams.get("filter[reportDate]") ?? "";
    asked.push(day);
    assert.equal(url.searchParams.get("filter[vendorNumber]"), "81234567");
    assert.match(String((init?.headers as Record<string, string>).Authorization), /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    if (day === "2026-10-20") return new Response(gzipSync(REPORT), { status: 200 });
    if (day === "2026-10-21") return new Response("server error", { status: 500 });
    return Response.json({ errors: [{ status: "404" }] }, { status: 404 });
  };
  const store = new MemoryStatsStore();
  const config = testConfig();
  try {
    const first = await loadAppStoreDays(config, days, now, store);
    assert.deepEqual(asked.sort(), ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-26", "2026-10-27"], "today is never asked");
    assert.deepEqual(first, {
      "2026-10-20": { ios: 3, mac: 3, redownloads: 4, updates: 9, purchases: 2 },
      "2026-10-21": null,
      "2026-10-22": emptyAppStoreDay(),
      "2026-10-26": null,
      "2026-10-27": null,
      "2026-10-28": null
    });

    asked.length = 0;
    const second = await loadAppStoreDays(config, days, now, store);
    assert.deepEqual(asked.sort(), ["2026-10-21", "2026-10-26", "2026-10-27"], "stored days are not asked again");
    assert.deepEqual(second, first);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a key that can't sign leaves the days empty instead of failing the page", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("", { status: 500 }); };
  try {
    const days = await loadAppStoreDays({ ...testConfig(), privateKey: "not a key" }, ["2026-10-20"], Date.parse("2026-10-28T12:00:00Z"), null);
    assert.deepEqual(days, { "2026-10-20": null });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});
