import assert from "node:assert/strict";
import test from "node:test";
import { GITHUB_FEED_URL, downloadRedirect, updateFeedRedirect, type CountedRedirectDeps } from "./counted-redirects.ts";
import { MemoryStatsStore } from "./site-stats.ts";

const NOW = Date.parse("2026-10-28T12:00:00Z");
const DAY = "2026-10-28";
const STABLE_DMG = "https://github.com/local-ai-cat/localaicat-site/releases/latest/download/LocalAIChatDirect.dmg";
const BETA_DMG = "https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-b17/LocalAIChatDirect-1.4.0-b17.dmg";
const SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const SPARKLE = "Local AI Chat/1.4.0 Sparkle/2.6.4";
const FEED = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0"><channel>
<item><sparkle:channel>beta</sparkle:channel><sparkle:version>479</sparkle:version><sparkle:shortVersionString>1.4.0-b17</sparkle:shortVersionString><enclosure url="${BETA_DMG}" length="1" type="application/octet-stream" /></item>
<item><sparkle:version>480</sparkle:version><sparkle:shortVersionString>1.4.0</sparkle:shortVersionString><enclosure url="https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-480/LocalAIChatDirect-1.4.0.dmg" length="1" type="application/octet-stream" /></item>
</channel></rss>`;

const originalDownloadUrl = process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL;
test.beforeEach(() => { delete process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL; });
test.after(() => {
  if (originalDownloadUrl === undefined) delete process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL;
  else process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL = originalDownloadUrl;
});

function deps(feed: string | null = FEED): CountedRedirectDeps & { store: MemoryStatsStore } {
  return { store: new MemoryStatsStore(), readFeed: async () => feed, now: () => NOW };
}

function request(path: string, userAgent: string | null, method = "GET"): Request {
  const headers = new Headers({ "x-real-ip": "203.0.113.7" });
  if (userAgent) headers.set("user-agent", userAgent);
  return new Request(`https://localaicat.com${path}`, { method, headers });
}

function assertUncachedRedirect(response: Response, location: string): void {
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), location);
  assert.equal(response.headers.get("cache-control"), "no-store");
}

test("the Mac button goes to the same GitHub DMG as before, and counts the stable version", async () => {
  const d = deps();
  const { response, record } = await downloadRedirect(request("/download/mac", SAFARI), "stable", d);
  assertUncachedRedirect(response, STABLE_DMG);
  await record();
  assert.deepEqual(await d.store.counts("downloads", [DAY]), { [DAY]: { "stable|1.4.0": 1 } });
});

test("beta goes to the feed's newest beta DMG; without a beta in the feed, to stable", async () => {
  const d = deps();
  const beta = await downloadRedirect(request("/download/beta", SAFARI), "beta", d);
  assertUncachedRedirect(beta.response, BETA_DMG);
  await beta.record();
  const noFeed = deps(null);
  const fallback = await downloadRedirect(request("/download/beta", SAFARI), "beta", noFeed);
  assertUncachedRedirect(fallback.response, STABLE_DMG);
  await fallback.record();
  assert.deepEqual(await d.store.counts("downloads", [DAY]), { [DAY]: { "beta|1.4.0-b17": 1 } });
  assert.deepEqual(await noFeed.store.counts("downloads", [DAY]), { [DAY]: { "stable|unknown": 1 } });
});

test("link previews and HEAD requests are redirected but not counted", async () => {
  const d = deps();
  for (const req of [request("/download/mac", "Slackbot-LinkExpanding 1.0"), request("/download/mac", null),
    request("/download/mac", SAFARI, "HEAD")]) {
    const { response, record } = await downloadRedirect(req, "stable", d);
    assertUncachedRedirect(response, STABLE_DMG);
    await record();
  }
  assert.deepEqual(await d.store.counts("downloads", [DAY]), { [DAY]: {} });
});

test("the update feed sends Sparkle to exactly the URL in the shipping app's Info.plist", async () => {
  const d = deps();
  const { response, record } = updateFeedRedirect(request("/updates/appcast.xml", SPARKLE), d);
  assertUncachedRedirect(response, GITHUB_FEED_URL);
  // A redirect has no body of its own: everything the client reads comes from GitHub.
  assert.equal(await response.text(), "");
  await record();
  assert.deepEqual(await d.store.macs([DAY]), { [DAY]: { "1.4.0": 1 } });
});

test("a 1.4.0 client following the redirect reads the identical appcast it reads from GitHub today", async () => {
  // GitHub's own answer for the feed: two redirects, then the bytes as application/octet-stream.
  const github = new Map<string, Response | (() => Response)>([
    [GITHUB_FEED_URL, () => new Response(null, { status: 302, headers: { location: "https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-480/appcast.xml" } })],
    ["https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-480/appcast.xml", () => new Response(null, { status: 302, headers: { location: "https://release-assets.githubusercontent.com/appcast" } })],
    ["https://release-assets.githubusercontent.com/appcast", () => new Response(FEED, { headers: { "content-type": "application/octet-stream" } })]
  ]);
  const site = (url: string): Response =>
    url === "https://localaicat.com/updates/appcast.xml"
      ? updateFeedRedirect(request("/updates/appcast.xml", SPARKLE), deps()).response
      : (github.get(url) as () => Response)();
  // What URLSession does for Sparkle: follow redirects to the final response.
  async function sparkleFetch(url: string): Promise<{ body: Buffer; contentType: string | null; hops: string[] }> {
    const hops: string[] = [];
    let response = site(url);
    while (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location") as string;
      hops.push(next);
      response = site(next);
    }
    return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type"), hops };
  }
  const direct = await sparkleFetch(GITHUB_FEED_URL);
  const viaSite = await sparkleFetch("https://localaicat.com/updates/appcast.xml");
  assert.deepEqual(viaSite.body, direct.body);
  assert.equal(viaSite.contentType, direct.contentType);
  assert.deepEqual(viaSite.hops, [GITHUB_FEED_URL, ...direct.hops]);
});

test("the update feed stays the app's SUFeedURL even when the download env points elsewhere", () => {
  process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL = "https://downloads.example/releases/latest/download/LocalAIChatDirect.dmg";
  const { response } = updateFeedRedirect(request("/updates/appcast.xml", SPARKLE), deps());
  assertUncachedRedirect(response, GITHUB_FEED_URL);
});

test("only Sparkle's GET is an update check", async () => {
  const d = deps();
  for (const req of [request("/updates/appcast.xml", SAFARI), request("/updates/appcast.xml", SPARKLE, "HEAD"),
    request("/updates/appcast.xml", null)]) {
    const { response, record } = updateFeedRedirect(req, d);
    assertUncachedRedirect(response, GITHUB_FEED_URL);
    await record();
  }
  assert.deepEqual(await d.store.counts("update-checks", [DAY]), { [DAY]: {} });
});
