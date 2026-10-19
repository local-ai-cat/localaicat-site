import test from "node:test";
import assert from "node:assert/strict";
import { analyticsAllowed, sanitizeAnalyticsEvent, trackSiteAction } from "./site-analytics.ts";
import { parseExplorerSnapshot } from "./explorer-client.ts";

test("analytics respects the browser and saved privacy choices", () => {
  assert.equal(analyticsAllowed(false, null, false), true);
  assert.equal(analyticsAllowed(true, null, false), false);
  assert.equal(analyticsAllowed(false, "1", false), false);
  assert.equal(analyticsAllowed(false, null, true), false);
  assert.equal(sanitizeAnalyticsEvent({type:"pageview",url:"https://localaicat.com/"}, false), null);
});

test("page and click events strip every query parameter and fragment", () => {
  for (const type of ["pageview", "event"] as const) {
    assert.deepEqual(sanitizeAnalyticsEvent({type, url:"https://localaicat.com/?cat=SC2.secret&birthday=2001-01-01&mode=space#private"}, true), {type, url:"https://localaicat.com/"});
  }
});

test("account, checkout, unknown and private routes do not become analytics", () => {
  for (const path of ["/manage", "/success", "/buy/pro-monthly", "/api/explorers", "/internal/test", "/shh", "/cat/secret-name"]) {
    assert.equal(sanitizeAnalyticsEvent({type:"pageview",url:`https://localaicat.com${path}`}, true), null);
  }
  assert.equal(sanitizeAnalyticsEvent({type:"pageview",url:"broken"}, true), null);
});

test("public download, pricing and help pages are counted without query data", () => {
  for (const path of ["/download/app-store", "/outdoor", "/pricing/direct", "/pricing/app-store", "/contact", "/help/ssh", "/docs/packages", "/terms/fr"]) {
    assert.equal(sanitizeAnalyticsEvent({type:"pageview",url:`https://localaicat.com${path}?secret=omit`}, true)?.url, `https://localaicat.com${path}`);
  }
});

test("action events send only fixed names and channel, and stop immediately after opt-out", (context) => {
  const sent: unknown[][] = [];
  let preference = "0";
  const mocks: Record<string, unknown> = {
    window: {va: (...args: unknown[]) => sent.push(args)},
    location: {hostname:"local-ai-cat-space-preview.vercel.app"},
    navigator: {doNotTrack:null,globalPrivacyControl:false},
    localStorage: {getItem: () => preference}
  };
  for (const [key, value] of Object.entries(mocks)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value,configurable:true});
    context.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  trackSiteAction("download_clicked", "mac");
  trackSiteAction("download_clicked", "app_store");
  trackSiteAction("creator_opened");
  trackSiteAction("cat_code_copied");
  trackSiteAction("download_clicked");
  assert.deepEqual(sent, [
    ["event",{name:"download_clicked",data:{channel:"mac"},options:undefined}],
    ["event",{name:"download_clicked",data:{channel:"app_store"},options:undefined}],
    ["event",{name:"creator_opened",options:undefined}],
    ["event",{name:"cat_code_copied",options:undefined}]
  ]);
  preference = "1";
  trackSiteAction("download_clicked", "mac");
  assert.equal(sent.length, 4);
});

const snapshot = {
  available: true, active: null, visitsToday: 12, day: "2026-10-17",
  serverTime: Date.parse("2026-10-17T12:00:00Z"), updatedAt: Date.parse("2026-10-17T11:59:30Z"),
  visitsWindow: "utc-day", source: "vercel-web-analytics"
};

test("daily visitor counts accept genuine zero but never invent live presence", () => {
  assert.deepEqual(parseExplorerSnapshot(snapshot), snapshot);
  assert.equal(parseExplorerSnapshot({...snapshot, visitsToday:0})?.visitsToday, 0);
  assert.equal(parseExplorerSnapshot({...snapshot, active:12}), null);
  assert.equal(parseExplorerSnapshot({...snapshot, available:false}), null);
  assert.equal(parseExplorerSnapshot({...snapshot, available:false, visitsToday:null, updatedAt:null})?.available, false);
});

test("the sign rejects mismatched dates, unsafe counts and invalid timestamps", () => {
  for (const patch of [{day:"2026-10-16"}, {visitsToday:-1}, {visitsToday:1.5}, {updatedAt:NaN},
    {updatedAt:Date.parse("2026-10-18T00:00:00Z")}, {updatedAt:Date.parse("2026-10-16T23:59:59Z")}]) {
    assert.equal(parseExplorerSnapshot({...snapshot,...patch}), null);
  }
});
