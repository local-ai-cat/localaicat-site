import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORER_ANALYTICS_CACHE_MS,
  EXPLORER_ANALYTICS_RETRY_MS,
  explorerAnalyticsConfig,
  handleExplorerRequest,
  VercelExplorerAnalytics,
  type ExplorerAnalyticsConfig,
  type ExplorerAnalyticsFetch
} from "./explorer-presence.ts";

const NOW = Date.parse("2026-10-17T12:00:00Z");
const ORIGIN = "https://space-review.vercel.app";
const CONFIG: ExplorerAnalyticsConfig = {
  token: "test-secret-never-public",
  projectId: "prj_fixture",
  teamId: "team_fixture",
  environment: "preview"
};
function request(suffix = ""): Request {
  return new Request(`${ORIGIN}/api/explorers${suffix}`);
}
function fixture(visitors = 12, day = "2026-10-17"): unknown {
  return {
    version: 1,
    query: { groupBy: ["day"], since: day, until: day },
    data: [{ timestamp: `${day}T00:00:00.000Z`, visitors, pageviews: visitors * 2 }]
  };
}
function reader(payload: unknown = fixture()): VercelExplorerAnalytics {
  return new VercelExplorerAnalytics(CONFIG, async () => Response.json(payload));
}
function unavailable(now = NOW): unknown {
  return {
    available: false, active: null, visitsToday: null,
    day: new Date(now).toISOString().slice(0, 10), serverTime: now,
    updatedAt: null, visitsWindow: "utc-day", source: "vercel-web-analytics"
  };
}

test("public projection is daily visitors, never pageviews or fabricated live presence", async () => {
  const result = await handleExplorerRequest(request(), reader(), NOW);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.deepEqual(await result.json(), {
    available: true, active: null, visitsToday: 12,
    day: "2026-10-17", serverTime: NOW, updatedAt: NOW,
    visitsWindow: "utc-day", source: "vercel-web-analytics"
  });
});

test("only fixed project/team visits aggregates are queried, in a single UTC day", async () => {
  const fetcher: ExplorerAnalyticsFetch = async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.vercel.com");
    assert.equal(url.pathname, "/v1/query/web-analytics/visits/aggregate");
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      projectId: CONFIG.projectId, teamId: CONFIG.teamId,
      since: "2026-10-17T00:00:00.000Z", until: "2026-10-17T23:59:59.999Z",
      by: "day", filter: "environment eq 'preview'"
    });
    assert.equal(init.method, "GET");
    assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${CONFIG.token}`);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json(fixture());
  };
  const result = await handleExplorerRequest(request("?projectId=prj_other&teamId=team_other&url=https://evil.example&by=visitorId&filter=eventName"), new VercelExplorerAnalytics(CONFIG, fetcher), NOW);
  assert.equal((await result.json()).visitsToday, 12);
});

test("upstream metadata and credentials never enter the public response", async () => {
  const payload = {
    version: 1,
    data: [{timestamp:"2026-10-17T00:00:00.000Z", visitors:3, pageviews:8, visitorId:"private-id", referrerHostname:"private-referrer", token:CONFIG.token}],
    query: { projectId: CONFIG.projectId, teamId: CONFIG.teamId }
  };
  const body = await (await handleExplorerRequest(request(), reader(payload), NOW)).text();
  for (const forbidden of ["private-id", "private-referrer", CONFIG.token, CONFIG.projectId, CONFIG.teamId!, "pageviews"]) {
    assert.ok(!body.includes(forbidden));
  }
});

test("a successful empty visit aggregate is zero; an unconfigured service is unavailable", async () => {
  const empty = await handleExplorerRequest(request(), reader({version:1, data:[]}), NOW);
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

test("dedicated server environment is required and legacy Redis/local fixture flags have no effect", () => {
  const base = {VERCEL_ANALYTICS_READ_TOKEN:CONFIG.token, VERCEL_ANALYTICS_PROJECT_ID:CONFIG.projectId};
  assert.equal(explorerAnalyticsConfig({}), null);
  assert.equal(explorerAnalyticsConfig({EXPLORER_PRESENCE_LOCAL:"1", EXPLORER_REDIS_REST_URL:"https://redis.example",EXPLORER_REDIS_REST_TOKEN:"old"}), null);
  assert.deepEqual(explorerAnalyticsConfig(base), {...CONFIG, teamId:undefined});
  assert.deepEqual(explorerAnalyticsConfig({...base, VERCEL_ENV:"production"}), {...CONFIG, teamId:undefined, environment:"production"});
  assert.equal(explorerAnalyticsConfig({...base, VERCEL_ANALYTICS_TEAM_ID:"unknown/../../"}), null);
  assert.equal(explorerAnalyticsConfig({...base, VERCEL_ANALYTICS_PROJECT_ID:"arbitrary-project"}), null);
  assert.equal(explorerAnalyticsConfig({...base, VERCEL_ANALYTICS_ENVIRONMENT:"all' or true"}), null);
  assert.equal(explorerAnalyticsConfig({...base, VERCEL_ANALYTICS_READ_TOKEN:"token\nwith-header"}), null);
  assert.deepEqual(explorerAnalyticsConfig({...base, VERCEL_ANALYTICS_TEAM_ID:CONFIG.teamId, VERCEL_ANALYTICS_ENVIRONMENT:"production"}), {...CONFIG,environment:"production"});
});

test("authorization, entitlement, rate limit, redirect and service failures stay unavailable", async () => {
  for (const code of [301,400,401,402,403,404,410,429,500,503]) {
    const analytics = new VercelExplorerAnalytics(CONFIG, async () => new Response("secret provider details", {status:code}));
    const response = await handleExplorerRequest(request(), analytics, NOW);
    assert.deepEqual(await response.json(), unavailable());
  }
  const rejecting = {sample: async () => {throw new Error("private internal details");}};
  assert.deepEqual(await (await handleExplorerRequest(request(), rejecting, NOW)).json(), unavailable());
});

test("custom events, changed schemas, wrong days and malformed metrics cannot become visitors", async () => {
  const row = {timestamp:"2026-10-17T00:00:00.000Z",visitors:1,pageviews:2};
  for (const data of [
    null, {}, {version:2,data:[]}, {version:1,data:{}},
    {version:1,data:[{timestamp:row.timestamp,visitors:100,count:1000}]},
    {version:1,data:[{...row,timestamp:"2026-10-16T00:00:00.000Z"}]},
    {version:1,data:[row,row]}, {version:1,data:[{...row,visitors:-1}]},
    {version:1,data:[{...row,visitors:"1"}]}, {version:1,data:[{...row,visitors:1.5}]},
    {version:1,data:[{...row,visitors:Number.MAX_SAFE_INTEGER+1}]},
    {version:1,data:[{...row,visitors:3}]}
  ]) {
    assert.deepEqual(await (await handleExplorerRequest(request(), reader(data), NOW)).json(), unavailable());
  }
  const brokenJson = new VercelExplorerAnalytics(CONFIG, async () => new Response("not JSON"));
  assert.equal(await brokenJson.sample(NOW), null);
});

test("oversized upstream bodies are bounded with and without content-length", async () => {
  const headerCases: Record<string, string>[] = [{"content-length":"20000"}, {}];
  for (const headers of headerCases) {
    const analytics = new VercelExplorerAnalytics(CONFIG, async () => new Response(" ".repeat(20_000), {headers}));
    assert.equal(await analytics.sample(NOW), null);
  }
});

test("concurrent public reads share one upstream request and a sixty-second aggregate cache", async () => {
  let calls = 0;
  let finish: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const analytics = new VercelExplorerAnalytics(CONFIG, async () => {
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
  const analytics = new VercelExplorerAnalytics(CONFIG, async () => {
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
  const analytics = new VercelExplorerAnalytics(CONFIG, async input => {
    calls++;
    const day = new URL(input).searchParams.get("since")!.slice(0,10);
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
  const analytics = new VercelExplorerAnalytics(CONFIG, async input => {
    calls++;
    const day = new URL(input).searchParams.get("since")!.slice(0,10);
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
  const analytics = new VercelExplorerAnalytics(CONFIG, async (_input, init) => {
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
