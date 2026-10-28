import { getDirectDownloadUrl } from "./env.ts";
import { appcastItemForChannel, getAppcastUrl } from "./direct-download-release.ts";
import {
  isLikelyBot,
  recordDownload,
  recordUpdateCheck,
  siteStatsStore,
  sparkleAppVersion,
  statsRequest,
  type DownloadChannel,
  type SiteStatsStore
} from "./site-stats.ts";

/**
 * The site's counted doors: /download/<channel> and /updates/appcast.xml count, then send the client on
 * to the very same GitHub URL it used before. Nothing is proxied, so GitHub still serves every byte,
 * header and redirect. Each handler returns the redirect and, separately, the counting work, which the
 * route runs after the response is sent.
 */

/** The feed the shipping app has in its Info.plist (SUFeedURL). */
export const GITHUB_FEED_URL = "https://github.com/local-ai-cat/localaicat-site/releases/latest/download/appcast.xml";
const FEED_TIMEOUT_MS = 3_000;

export type CountedRedirect = { response: Response; record: () => Promise<void> };
export type FeedReader = (url: string) => Promise<string | null>;
export type CountedRedirectDeps = { store: SiteStatsStore | null; readFeed: FeedReader; now: () => number };

/** The appcast GitHub serves next to the DMG, cached for five minutes like the release info. */
export async function readFeed(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

function defaultDeps(): CountedRedirectDeps {
  return { store: siteStatsStore(), readFeed, now: Date.now };
}

export function feedUrl(): string {
  return getAppcastUrl(getDirectDownloadUrl()) ?? GITHUB_FEED_URL;
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 302,
    // Every click and check has to reach the site to be counted, so no cache may keep the redirect.
    headers: { Location: location, "Cache-Control": "no-store" }
  });
}

function nothingToRecord(): Promise<void> {
  return Promise.resolve();
}

/**
 * Stable goes where the download button always went (the DMG behind GitHub's "latest" alias); beta goes
 * to the newest beta in the feed, or to stable when the feed has none.
 */
export async function downloadRedirect(
  request: Request, channel: DownloadChannel, deps: CountedRedirectDeps = defaultDeps()
): Promise<CountedRedirect> {
  const stableUrl = getDirectDownloadUrl();
  const xml = channel === "beta" ? await deps.readFeed(feedUrl()) : null;
  const beta = xml ? appcastItemForChannel(xml, "beta") : null;
  const counted: DownloadChannel = beta?.downloadUrl ? "beta" : "stable";
  const response = redirectTo(beta?.downloadUrl ?? stableUrl);
  if (request.method !== "GET" || isLikelyBot(request.headers.get("user-agent"))) {
    return { response, record: nothingToRecord };
  }
  const now = deps.now();
  return {
    response,
    record: async () => {
      const version = counted === "beta"
        ? beta?.version ?? null
        : appcastItemForChannel(await deps.readFeed(feedUrl()) ?? "", null)?.version ?? null;
      await recordDownload(deps.store, counted, version, now);
    }
  };
}

/**
 * Sparkle's update check. The client is sent to GitHub's feed URL, the one it would have asked for itself,
 * so it gets the identical appcast; only a request that says it is Sparkle is counted.
 */
export function updateFeedRedirect(request: Request, deps: CountedRedirectDeps = defaultDeps()): CountedRedirect {
  const response = redirectTo(feedUrl());
  const version = request.method === "GET" ? sparkleAppVersion(request.headers.get("user-agent")) : null;
  if (!version) return { response, record: nothingToRecord };
  const now = deps.now();
  const caller = statsRequest(request.headers);
  return { response, record: () => recordUpdateCheck(deps.store, version, caller, now) };
}
