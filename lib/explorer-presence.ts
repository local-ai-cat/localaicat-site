/** Server-side, read-only projection of GoatCounter's daily visitors. Never import into a client component. */
export const EXPLORER_ANALYTICS_CACHE_MS = 60_000;
export const EXPLORER_ANALYTICS_RETRY_MS = 30_000;
export const EXPLORER_ANALYTICS_TIMEOUT_MS = 4_000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
// stats/total also lists hourly rows for the day: a little over 2 KB in practice, so this leaves ample room.
const MAX_RESPONSE_BYTES = 65_536;
const DEFAULT_GOATCOUNTER_SITE = "localaicat";

export type ExplorerSnapshot = {
  available: boolean;
  active: null;
  visitsToday: number | null;
  day: string;
  serverTime: number;
  updatedAt: number | null;
  visitsWindow: "utc-day";
  source: "goatcounter";
};
export type ExplorerDailyVisitors = { visitors: number; updatedAt: number };
export interface ExplorerAnalyticsReader {
  sample(now: number): Promise<ExplorerDailyVisitors | null>;
}
export type ExplorerAnalyticsConfig = {
  /** A GoatCounter API key with only "Read statistics": it can read counts and nothing else. */
  token: string;
  /** The GoatCounter site code, as in https://<site>.goatcounter.com. */
  site: string;
};
export type ExplorerAnalyticsFetch = (url: string, init: RequestInit) => Promise<Response>;

export function explorerUtcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function explorerAnalyticsConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): ExplorerAnalyticsConfig | null {
  const token = env.GOATCOUNTER_READ_TOKEN?.trim();
  const site = env.GOATCOUNTER_SITE?.trim() || DEFAULT_GOATCOUNTER_SITE;
  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  // The site code becomes a hostname: letters, digits and inner hyphens only, so no other host can be named.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(site)) return null;
  return { token, site };
}

async function boundedJson(response: Response): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)) {
    throw new Error("Unexpected analytics response size");
  }
  if (!response.body) throw new Error("Missing analytics response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Unexpected analytics response size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** GoatCounter's `total_utc` is the visitor count for the UTC range asked for; anything else is not a count. */
function dailyVisitors(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid analytics response");
  const payload = value as Record<string, unknown>;
  if (!isCount(payload.total_utc) || !isCount(payload.total)) throw new Error("Invalid daily visit total");
  return payload.total_utc;
}

/** GoatCounter ranges are whole hours, and both ends are inclusive hour buckets (`hour <= end`). */
function hourAlignedIso(time: number): string {
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Official API: https://www.goatcounter.com/help/api (GET /api/v0/stats/total, OpenAPI at /api.json).
 * Ranges are rounded to the hour, so this endpoint deliberately publishes daily visitors, never a live presence
 * count. The cache holds the total only; GoatCounter remains the sole source of visitor counts.
 */
export class GoatCounterExplorerAnalytics implements ExplorerAnalyticsReader {
  private readonly config: ExplorerAnalyticsConfig;
  private readonly fetcher: ExplorerAnalyticsFetch;
  private cached?: { day: string; expiresAt: number; value: ExplorerDailyVisitors | null };
  private pending?: { day: string; result: Promise<ExplorerDailyVisitors | null> };

  constructor(config: ExplorerAnalyticsConfig, fetcher: ExplorerAnalyticsFetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async sample(now: number): Promise<ExplorerDailyVisitors | null> {
    const day = explorerUtcDay(now);
    if (this.cached?.day === day && now < this.cached.expiresAt) return this.cached.value;
    if (this.pending?.day === day) return this.pending.result;
    const result = this.query(now);
    this.pending = { day, result };
    const value = await result;
    // An old request finishing after midnight must not replace the new day's cache.
    if (this.pending?.result === result) {
      this.cached = {
        day,
        expiresAt: now + (value ? EXPLORER_ANALYTICS_CACHE_MS : EXPLORER_ANALYTICS_RETRY_MS),
        value
      };
      this.pending = undefined;
    }
    return value;
  }

  private async query(now: number): Promise<ExplorerDailyVisitors | null> {
    const start = Math.floor(now / DAY_MS) * DAY_MS;
    // The current hour's bucket is the last one: asking for the next hour (or midnight) would count tomorrow's first hour.
    const end = Math.floor(now / HOUR_MS) * HOUR_MS;
    const url = new URL(`https://${this.config.site}.goatcounter.com/api/v0/stats/total`);
    url.searchParams.set("start", hourAlignedIso(start));
    url.searchParams.set("end", hourAlignedIso(end));
    try {
      const result = await this.fetcher(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${this.config.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(EXPLORER_ANALYTICS_TIMEOUT_MS),
        redirect: "error",
        cache: "no-store"
      });
      if (!result.ok) {
        console.warn(`Explorer counter: GoatCounter answered ${result.status}`);
        return null;
      }
      return { visitors: dailyVisitors(await boundedJson(result)), updatedAt: now };
    } catch (error) {
      // A missing entitlement, expired token, timeout or provider outage is not zero traffic.
      console.warn(`Explorer counter: GoatCounter request failed (${error instanceof Error ? error.name : "unknown"})`);
      return null;
    }
  }
}

/** Counts only, so a stored value that isn't a key can be diagnosed without logging any of it. */
function tokenShape(token: string): string {
  const count = (pattern: RegExp): number => token.match(pattern)?.length ?? 0;
  const longestKeyRun = Math.max(0, ...(token.match(/[A-Za-z0-9_-]+/g) ?? []).map(run => run.length));
  return `length ${token.length}, whitespace ${count(/\s/g)}, control ${count(/[\u0000-\u001f\u007f]/g)}, ` +
    `non-ASCII ${count(/[^\u0000-\u007f]/g)}, longest key-like run ${longestKeyRun}`;
}

let warnedUnconfigured = false;
/** Says why the counter is off, once per instance; only the key's length is logged, never the key. */
function warnUnconfigured(env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (warnedUnconfigured) return;
  warnedUnconfigured = true;
  const token = env.GOATCOUNTER_READ_TOKEN?.trim() ?? "";
  const site = env.GOATCOUNTER_SITE?.trim() || DEFAULT_GOATCOUNTER_SITE;
  let reason = "GOATCOUNTER_SITE is not a valid site code";
  if (!token) reason = "GOATCOUNTER_READ_TOKEN is not set";
  else if (!/^[A-Za-z0-9_-]+$/.test(token)) reason = `GOATCOUNTER_READ_TOKEN has unexpected characters (${tokenShape(token)})`;
  console.warn(`Explorer counter off: ${reason} (site ${JSON.stringify(site.slice(0, 64))})`);
}

let configured: { config: ExplorerAnalyticsConfig; reader: GoatCounterExplorerAnalytics } | undefined;
export function configuredExplorerAnalytics(): ExplorerAnalyticsReader | null {
  const config = explorerAnalyticsConfig();
  if (!config) {
    warnUnconfigured();
    return null;
  }
  if (!configured || Object.keys(config).some(key =>
    config[key as keyof ExplorerAnalyticsConfig] !== configured?.config[key as keyof ExplorerAnalyticsConfig])) {
    configured = { config, reader: new GoatCounterExplorerAnalytics(config) };
  }
  return configured.reader;
}

export async function handleExplorerRequest(
  request: Request,
  analytics: ExplorerAnalyticsReader | null = configuredExplorerAnalytics(),
  now = Date.now()
): Promise<Response> {
  let count: ExplorerDailyVisitors | null = null;
  const status = request.method === "GET" ? 200 : 405;
  if (status === 200 && analytics) {
    try { count = await analytics.sample(now); } catch { /* Return honest unavailability. */ }
  }
  const body: ExplorerSnapshot = {
    available: count !== null,
    active: null,
    visitsToday: count?.visitors ?? null,
    day: explorerUtcDay(now),
    serverTime: now,
    updatedAt: count?.updatedAt ?? null,
    visitsWindow: "utc-day",
    source: "goatcounter"
  };
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff"
  };
  if (status === 405) headers.Allow = "GET";
  return Response.json(body, { status, headers });
}
