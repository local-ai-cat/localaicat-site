/** Server-side, read-only projection of Vercel Web Analytics. Never import into a client component. */
export const EXPLORER_ANALYTICS_CACHE_MS = 60_000;
export const EXPLORER_ANALYTICS_RETRY_MS = 30_000;
export const EXPLORER_ANALYTICS_TIMEOUT_MS = 4_000;
const DAY_MS = 86_400_000;
const MAX_RESPONSE_BYTES = 16_384;
const ANALYTICS_ENDPOINT = "https://api.vercel.com/v1/query/web-analytics/visits/aggregate";

export type ExplorerSnapshot = {
  available: boolean;
  active: null;
  visitsToday: number | null;
  day: string;
  serverTime: number;
  updatedAt: number | null;
  visitsWindow: "utc-day";
  source: "vercel-web-analytics";
};
export type ExplorerDailyVisitors = { visitors: number; updatedAt: number };
export interface ExplorerAnalyticsReader {
  sample(now: number): Promise<ExplorerDailyVisitors | null>;
}
export type ExplorerAnalyticsConfig = {
  token: string;
  projectId: string;
  teamId?: string;
  environment: "production" | "preview";
};
export type ExplorerAnalyticsFetch = (url: string, init: RequestInit) => Promise<Response>;

export function explorerUtcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function explorerAnalyticsConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): ExplorerAnalyticsConfig | null {
  const token = env.VERCEL_ANALYTICS_READ_TOKEN?.trim();
  const projectId = env.VERCEL_ANALYTICS_PROJECT_ID?.trim();
  const teamId = env.VERCEL_ANALYTICS_TEAM_ID?.trim();
  const environment = env.VERCEL_ANALYTICS_ENVIRONMENT?.trim() ||
    (env.VERCEL_ENV === "production" ? "production" : "preview");
  if (!token || /[\r\n]/.test(token) || !projectId || !/^prj_[a-zA-Z0-9]+$/.test(projectId)) return null;
  if (teamId && !/^team_[a-zA-Z0-9]+$/.test(teamId)) return null;
  if (environment !== "production" && environment !== "preview") return null;
  return { token, projectId, teamId, environment };
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

function dailyVisitors(value: unknown, day: string): number {
  if (!value || typeof value !== "object") throw new Error("Invalid analytics response");
  const payload = value as Record<string, unknown>;
  if (payload.version !== 1 || !Array.isArray(payload.data)) throw new Error("Invalid analytics response");
  // Empty, successful aggregate data means no recorded visits; unavailable data never means zero.
  if (payload.data.length === 0) return 0;
  if (payload.data.length !== 1) throw new Error("Unexpected analytics groups");
  const row = payload.data[0];
  if (!row || typeof row !== "object" || typeof row.timestamp !== "string" ||
      Date.parse(row.timestamp) !== Date.parse(`${day}T00:00:00.000Z`) ||
      !isCount(row.visitors) || !isCount(row.pageviews) || row.visitors > row.pageviews) {
    throw new Error("Invalid daily visit aggregate");
  }
  return row.visitors;
}

/**
 * Official API: https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views
 * The smallest time bucket is an hour, and ranges are rounded to that granularity.
 * Therefore this endpoint deliberately publishes daily visitors, never a live presence count.
 * The cache contains aggregates only; Vercel remains the sole source of visitor counts.
 */
export class VercelExplorerAnalytics implements ExplorerAnalyticsReader {
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
    const result = this.query(now, day);
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

  private async query(now: number, day: string): Promise<ExplorerDailyVisitors | null> {
    const start = Math.floor(now / DAY_MS) * DAY_MS;
    const url = new URL(ANALYTICS_ENDPOINT);
    url.searchParams.set("projectId", this.config.projectId);
    if (this.config.teamId) url.searchParams.set("teamId", this.config.teamId);
    url.searchParams.set("since", new Date(start).toISOString());
    url.searchParams.set("until", new Date(start + DAY_MS - 1).toISOString());
    url.searchParams.set("by", "day");
    url.searchParams.set("filter", `environment eq '${this.config.environment}'`);
    try {
      const result = await this.fetcher(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${this.config.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(EXPLORER_ANALYTICS_TIMEOUT_MS),
        redirect: "error",
        cache: "no-store"
      });
      if (!result.ok) return null;
      return { visitors: dailyVisitors(await boundedJson(result), day), updatedAt: now };
    } catch {
      // A missing entitlement, expired token, timeout or provider outage is not zero traffic.
      return null;
    }
  }
}

let configured: { config: ExplorerAnalyticsConfig; reader: VercelExplorerAnalytics } | undefined;
export function configuredExplorerAnalytics(): ExplorerAnalyticsReader | null {
  const config = explorerAnalyticsConfig();
  if (!config) return null;
  if (!configured || Object.keys(config).some(key =>
    config[key as keyof ExplorerAnalyticsConfig] !== configured?.config[key as keyof ExplorerAnalyticsConfig])) {
    configured = { config, reader: new VercelExplorerAnalytics(config) };
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
    source: "vercel-web-analytics"
  };
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff"
  };
  if (status === 405) headers.Allow = "GET";
  return Response.json(body, { status, headers });
}
