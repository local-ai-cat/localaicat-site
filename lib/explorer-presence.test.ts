import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORER_ANALYTICS_CACHE_MS,
  EXPLORER_ANALYTICS_RETRY_MS,
  explorerAnalyticsConfig,
  handleExplorerRequest,
  GoatCounterExplorerAnalytics,
  type ExplorerAnalyticsConfig,
  type ExplorerAnalyticsFetch
} from "./explorer-presence.ts";

const NOW = Date.parse("2026-10-17T12:00:00Z");
const ORIGIN = "https://space-review.vercel.app";
const CONFIG: ExplorerAnalyticsConfig = {
  token: "test-secret-never-public",
  site: "localaicat-test"
};
function request(suffix = ""): Request {
  return new Request(`${ORIGIN}/api/explorers${suffix}`);
}
function fixture(visitors = 12, day = "2026-10-17"): unknown {
  return {
    total: visitors,
    total_events: 0,
    total_utc: visitors,
    stats: [{ day, hourly: Array.from({ length: 24 }, () => 0), daily: visitors }]
  };
}
function reader(payload: unknown = fixture()): GoatCounterExplorerAnalytics {
  return new GoatCounterExplorerAnalytics(CONFIG, async () => Response.json(payload));
}
function unavailable(now = NOW): unknown {
  return {
    available: false, active: null, visitsToday: null,
    day: new Date(now).toISOString().slice(0, 10), serverTime: now,
    updatedAt: null, visitsWindow: "utc-day", source: "goatcounter"
  };
}

test("public projection is daily visitors, never pageviews or fabricated live presence", async () => {
  const result = await handleExplorerRequest(request(), reader(), NOW);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.deepEqual(await result.json(), {
    available: true, active: null, visitsToday: 12,
    day: "2026-10-17", serverTime: NOW, updatedAt: NOW,
    visitsWindow: "utc-day", source: "goatcounter"
  });
});

test("only the fixed site's total is queried, from UTC midnight to the current hour", async () => {
  const fetcher: ExplorerAnalyticsFetch = async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://localaicat-test.goatcounter.com");
    assert.equal(url.pathname, "/api/v0/stats/total");
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      start: "2026-10-17T00:00:00Z", end: "2026-10-17T12:00:00Z"
    });
    assert.equal(init.method, "GET");
    assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${CONFIG.token}`);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json(fixture());
  };
  const result = await handleExplorerRequest(request("?site=other&start=2000-01-01&url=https://evil.example&include_paths=1"), new GoatCounterExplorerAnalytics(CONFIG, fetcher), NOW);
  assert.equal((await result.json()).visitsToday, 12);
});

test("the range ends on the current hour's bucket, so it never reaches into the next UTC day (GoatCounter ends are inclusive)", async () => {
  const ranges: Record<string, string>[] = [];
  const analytics = (now: number): Promise<unknown> => new GoatCounterExplorerAnalytics(CONFIG, async input => {
    ranges.push(Object.fromEntries(new URL(input).searchParams));
    return Response.json(fixture());
  }).sample(now);
  await analytics(Date.parse("2026-10-17T00:00:00Z"));
  await analytics(Date.parse("2026-10-17T09:15:30Z"));
  await analytics(Date.parse("2026-10-17T23:59:59.999Z"));
  assert.deepEqual(ranges, [
    { start: "2026-10-17T00:00:00Z", end: "2026-10-17T00:00:00Z" },
    { start: "2026-10-17T00:00:00Z", end: "2026-10-17T09:00:00Z" },
    { start: "2026-10-17T00:00:00Z", end: "2026-10-17T23:00:00Z" }
  ]);
});

test("upstream metadata and credentials never enter the public response", async () => {
  const payload = {
    total: 3, total_events: 1, total_utc: 3,
    stats: [{day:"2026-10-17", hourly:[3], daily:3, path:"/private-path", ref:"private-referrer", token:CONFIG.token}]
  };
  const body = await (await handleExplorerRequest(request(), reader(payload), NOW)).text();
  for (const forbidden of ["private-path", "private-referrer", CONFIG.token, CONFIG.site, "total_events", "hourly"]) {
    assert.ok(!body.includes(forbidden));
  }
});

test("a successful empty visit aggregate is zero; an unconfigured service is unavailable", async () => {
  const empty = await handleExplorerRequest(request(), reader({total:0, total_events:0, total_utc:0, stats:[]}), NOW);
  assert.equal((await empty.json()).visitsToday, 0);
  const missing = await handleExplorerRequest(request(), null, NOW);
  assert.deepEqual(await missing.json(), unavailable());
});

test("writes are rejected and never read upstream or create visitors", async () => {
  let calls = 0;
  const analytics = {sample: async () => { calls++; return {visitors:1, updatedAt:NOW}; }};
  for (const method of ["POST", "PUT", "DELETE"]) {
    const result = await handleExplorerRequest(new Request(`${ORIGIN}/api/explorers`, {
      method, body: JSON.stringify({sessionId:"no-longer-supported"})
    }), analytics, NOW);
    assert.equal(result.status, 405);
    assert.equal(result.headers.get("allow"), "GET");
    assert.deepEqual(await result.json(), unavailable());
  }
  assert.equal(calls, 0);
});

test("dedicated server environment is required and legacy Vercel/Redis/local flags have no effect", () => {
  const base = {GOATCOUNTER_READ_TOKEN:CONFIG.token, GOATCOUNTER_SITE:CONFIG.site};
  assert.equal(explorerAnalyticsConfig({}), null);
  assert.equal(explorerAnalyticsConfig({EXPLORER_PRESENCE_LOCAL:"1", EXPLORER_REDIS_REST_URL:"https://redis.example",EXPLORER_REDIS_REST_TOKEN:"old"}), null);
  assert.equal(explorerAnalyticsConfig({VERCEL_ANALYTICS_READ_TOKEN:"old", VERCEL_ANALYTICS_PROJECT_ID:"prj_old"}), null);
  assert.deepEqual(explorerAnalyticsConfig(base), CONFIG);
  assert.deepEqual(explorerAnalyticsConfig({GOATCOUNTER_READ_TOKEN:CONFIG.token}), {token:CONFIG.token, site:"localaicat"});
  for (const site of ["evil.example/x", "a.b", "-lead", "trail-", "UPPER", "x".repeat(64), "localaicat.goatcounter.com#"]) {
    assert.equal(explorerAnalyticsConfig({...base, GOATCOUNTER_SITE:site}), null, site);
  }
  for (const token of ["token\nwith-header", "token with-space", "tok\ren"]) {
    assert.equal(explorerAnalyticsConfig({...base, GOATCOUNTER_READ_TOKEN:token}), null, JSON.stringify(token));
  }
});

test("authorization, entitlement, rate limit, redirect and service failures stay unavailable", async () => {
  for (const code of [301,400,401,402,403,404,410,429,500,503]) {
    const analytics = new GoatCounterExplorerAnalytics(CONFIG, async () => new Response("secret provider details", {status:code}));
    const response = await handleExplorerRequest(request(), analytics, NOW);
    assert.deepEqual(await response.json(), unavailable());
  }
  const rejecting = {sample: async () => {throw new Error("private internal details");}};
  assert.deepEqual(await (await handleExplorerRequest(request(), rejecting, NOW)).json(), unavailable());
});

test("changed schemas and malformed totals cannot become visitors", async () => {
  const total = {total:1, total_events:0, total_utc:1};
  for (const data of [
    null, {}, [], [total], {error:"denied"}, {total:5}, {total_utc:5},
    {...total, total_utc:-1}, {...total, total_utc:"1"}, {...total, total_utc:1.5},
    {...total, total_utc:Number.MAX_SAFE_INTEGER+1}, {...total, total:null}, {...total, total_utc:null}
  ]) {
    assert.deepEqual(await (await handleExplorerRequest(request(), reader(data), NOW)).json(), unavailable());
  }
  const brokenJson = new GoatCounterExplorerAnalytics(CONFIG, async () => new Response("not JSON"));
  assert.equal(await brokenJson.sample(NOW), null);
});

test("oversized upstream bodies are bounded with and without content-length", async () => {
  const headerCases: Record<string, string>[] = [{"content-length":"70000"}, {}];
  for (const headers of headerCases) {
    const analytics = new GoatCounterExplorerAnalytics(CONFIG, async () => new Response(" ".repeat(70_000), {headers}));
    assert.equal(await analytics.sample(NOW), null);
  }
});

test("concurrent public reads share one upstream request and a sixty-second aggregate cache", async () => {
  let calls = 0;
  let finish: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const analytics = new GoatCounterExplorerAnalytics(CONFIG, async () => {
    calls++;
    await gate;
    return Response.json(fixture(calls));
  });
  const requests = Array.from({length:25}, () => analytics.sample(NOW));
  finish?.();
  const results = await Promise.all(requests);
  assert.equal(calls, 1);
  assert.ok(results.every(value => value?.visitors === 1));
  assert.deepEqual(await analytics.sample(NOW+EXPLORER_ANALYTICS_CACHE_MS-1), {visitors:1,updatedAt:NOW});
  assert.deepEqual(await analytics.sample(NOW+EXPLORER_ANALYTICS_CACHE_MS), {visitors:2,updatedAt:NOW+EXPLORER_ANALYTICS_CACHE_MS});
  assert.equal(calls, 2);
});

test("provider failures back off without serving stale or fabricated traffic", async () => {
  let calls = 0;
  const analytics = new GoatCounterExplorerAnalytics(CONFIG, async () => {
    calls++;
    if (calls === 1 || calls === 3) return Response.json(fixture(calls));
    throw new Error("provider unavailable");
  });
  assert.equal((await analytics.sample(NOW))?.visitors, 1);
  const failureTime = NOW+EXPLORER_ANALYTICS_CACHE_MS;
  assert.equal(await analytics.sample(failureTime), null);
  assert.equal(await analytics.sample(failureTime+EXPLORER_ANALYTICS_RETRY_MS-1), null);
  assert.equal(calls, 2);
  assert.equal((await analytics.sample(failureTime+EXPLORER_ANALYTICS_RETRY_MS))?.visitors, 3);
});

test("UTC midnight invalidates cache immediately and does not sum hourly visitors", async () => {
  let calls = 0;
  const midnight = Date.parse("2026-10-18T00:00:00Z");
  const analytics = new GoatCounterExplorerAnalytics(CONFIG, async input => {
    calls++;
    const day = new URL(input).searchParams.get("start")!.slice(0,10);
    return Response.json(fixture(calls,day));
  });
  await analytics.sample(midnight-1);
  const result = await handleExplorerRequest(request(), analytics, midnight);
  const body = await result.json();
  assert.equal(calls, 2);
  assert.equal(body.day,"2026-10-18");
  assert.equal(body.visitsToday,2);
});

test("a previous-day request finishing late cannot replace the next day's cache", async () => {
  let calls = 0;
  let releasePreviousDay: (() => void) | undefined;
  const gate = new Promise<void>(resolve => {releasePreviousDay=resolve;});
  const midnight = Date.parse("2026-10-18T00:00:00Z");
  const analytics = new GoatCounterExplorerAnalytics(CONFIG, async input => {
    calls++;
    const day = new URL(input).searchParams.get("start")!.slice(0,10);
    if (day === "2026-10-17") await gate;
    return Response.json(fixture(day === "2026-10-17" ? 99 : 1,day));
  });
  const previous = analytics.sample(midnight-1);
  await analytics.sample(midnight);
  releasePreviousDay?.();
  await previous;
  assert.equal((await analytics.sample(midnight+1))?.visitors,1);
  assert.equal(calls,2);
});

test("outbound timeout aborts a hanging provider request", async () => {
  const analytics = new GoatCounterExplorerAnalytics(CONFIG, async (_input, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error("timeout did not abort")), 5_000);
      init.signal?.addEventListener("abort", () => {
        clearTimeout(keepAlive);
        reject(init.signal?.reason);
      }, {once:true});
    });
  });
  const started = Date.now();
  assert.equal(await analytics.sample(NOW),null);
  assert.ok(Date.now()-started < 4_800);
});
