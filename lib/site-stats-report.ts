import { emptyAppStoreDay, loadAppStoreDays, type AppStoreDay, type AppStoreDays } from "./app-store-sales.ts";
import { getAppStoreSalesConfig, getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import { explorerAnalyticsConfig, type ExplorerAnalyticsConfig } from "./explorer-presence.ts";
import { siteStatsStore, statsDays, type DailyCounts, type SiteStatsStore } from "./site-stats.ts";

/** Everything /stats shows, gathered on the server. Each source can be missing on its own. */

export const REPORT_DAYS = 30;
const RELEASES_URL = "https://api.github.com/repos/local-ai-cat/localaicat-site/releases";
const RELEASE_PAGES = 5;
const SOURCE_TIMEOUT_MS = 5_000;

export type ReleaseChannel = "stable" | "beta" | "alpha";
export type GitHubRelease = { tag: string; publishedAt: string | null; dmgDownloads: number };
export type GitHubHistory = {
  channels: { channel: ReleaseChannel; releases: number; dmgDownloads: number }[];
  topStable: GitHubRelease[];
};
export type DayValue = { day: string; value: number };
export type StatsReport = {
  days: string[];
  storage: "redis" | "memory" | "off";
  downloads: { day: string; stable: number; beta: number }[] | null;
  downloadsByVersion: { channel: string; version: string; count: number }[];
  macsToday: { version: string; macs: number }[];
  macsByDay: DayValue[] | null;
  checkoutsByPlan: { plan: string; count: number }[];
  visits: DayValue[] | null;
  github: GitHubHistory | null;
  appStore: AppStoreReport | null;
  orders: OrdersReport | null;
};
/** Polar orders over the window, as counts: a first order (purchase or new subscription) and renewals. */
export type OrdersReport = { newPaid: number; newFree: number; renewals: number };
export type AppStoreReport = {
  daily: { day: string; ios: number; mac: number }[];
  totals: AppStoreDay;
  /** The newest day Apple has published; later days in the window are still to come. */
  latestDay: string | null;
};

export function releaseChannel(tag: string): ReleaseChannel {
  if (/-a\d+$/.test(tag)) return "alpha";
  if (/-b\d+$/.test(tag)) return "beta";
  return "stable";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** GitHub's per-file totals (no dates): the only download history from before the site counted. */
export function summariseReleases(raw: unknown[]): GitHubHistory {
  const releases: (GitHubRelease & { channel: ReleaseChannel })[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const release = item as { tag_name?: unknown; published_at?: unknown; draft?: unknown; assets?: unknown };
    if (typeof release.tag_name !== "string" || release.draft === true) continue;
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const dmgDownloads = assets.reduce((sum: number, asset: { name?: unknown; download_count?: unknown }) =>
      typeof asset?.name === "string" && asset.name.endsWith(".dmg") && isCount(asset.download_count)
        ? sum + asset.download_count : sum, 0);
    releases.push({
      tag: release.tag_name,
      publishedAt: typeof release.published_at === "string" ? release.published_at.slice(0, 10) : null,
      dmgDownloads,
      channel: releaseChannel(release.tag_name)
    });
  }
  const channels = (["stable", "beta", "alpha"] as const).map(channel => {
    const inChannel = releases.filter(release => release.channel === channel);
    return { channel, releases: inChannel.length, dmgDownloads: inChannel.reduce((sum, r) => sum + r.dmgDownloads, 0) };
  });
  const topStable = releases.filter(release => release.channel === "stable")
    .sort((a, b) => b.dmgDownloads - a.dmgDownloads).slice(0, 5)
    .map(({ tag, publishedAt, dmgDownloads }) => ({ tag, publishedAt, dmgDownloads }));
  return { channels, topStable };
}

async function fetchGitHubHistory(): Promise<GitHubHistory | null> {
  try {
    const raw: unknown[] = [];
    for (let page = 1; page <= RELEASE_PAGES; page += 1) {
      const response = await fetch(`${RELEASES_URL}?per_page=100&page=${page}`, {
        headers: { Accept: "application/vnd.github+json" },
        // Unauthenticated: 60 calls an hour per address, so the hour-long cache matters.
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS)
      });
      if (!response.ok) return null;
      const items: unknown = await response.json();
      if (!Array.isArray(items)) return null;
      raw.push(...items);
      if (items.length < 100) break;
    }
    return summariseReleases(raw);
  } catch {
    return null;
  }
}

/** GoatCounter's daily visitors over the window, read with the explorer sign's token. */
export function dailyVisits(payload: unknown, days: readonly string[]): DayValue[] | null {
  if (!payload || typeof payload !== "object") return null;
  const stats = (payload as { stats?: unknown }).stats;
  if (!Array.isArray(stats)) return null;
  const byDay = new Map<string, number>();
  for (const entry of stats) {
    const { day, daily } = (entry ?? {}) as { day?: unknown; daily?: unknown };
    if (typeof day === "string" && isCount(daily)) byDay.set(day.slice(0, 10), daily);
  }
  return days.map(day => ({ day, value: byDay.get(day) ?? 0 }));
}

async function fetchVisits(config: ExplorerAnalyticsConfig | null, days: readonly string[], now: number): Promise<DayValue[] | null> {
  if (!config) return null;
  const url = new URL(`https://${config.site}.goatcounter.com/api/v0/stats/total`);
  url.searchParams.set("start", `${days[0]}T00:00:00Z`);
  // Both ends are inclusive hour buckets; the current hour is the last one with data.
  url.searchParams.set("end", new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"));
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store"
    });
    return response.ok ? dailyVisits(await response.json(), days) : null;
  } catch {
    return null;
  }
}

const ORDER_PAGES = 5;
const FIRST_ORDER_REASONS = new Set(["purchase", "subscription_create"]);

/**
 * Counts paid orders only: no amount, customer or product leaves this function. A first order that cost
 * nothing (a full discount such as PURRDAIN, or a free trial) is counted apart from paying ones.
 */
export function summariseOrders(items: unknown[]): OrdersReport {
  const report: OrdersReport = { newPaid: 0, newFree: 0, renewals: 0 };
  for (const item of items) {
    const { paid, billing_reason: reason, total_amount: total } = (item ?? {}) as {
      paid?: unknown; billing_reason?: unknown; total_amount?: unknown;
    };
    if (paid !== true || typeof reason !== "string") continue;
    if (FIRST_ORDER_REASONS.has(reason)) {
      if (typeof total === "number" && total > 0) report.newPaid += 1;
      else report.newFree += 1;
    } else if (reason === "subscription_cycle") {
      report.renewals += 1;
    }
  }
  return report;
}

/** The window's orders, read with the site's Polar key (orders:read). */
async function fetchOrders(adminKey: string | null, apiBase: string, days: readonly string[]): Promise<OrdersReport | null> {
  if (!adminKey) return null;
  const items: unknown[] = [];
  try {
    for (let page = 1; page <= ORDER_PAGES; page += 1) {
      const url = new URL(`${apiBase}/v1/orders/`);
      url.searchParams.set("created_after", `${days[0]}T00:00:00Z`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("page", String(page));
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${adminKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        redirect: "error",
        cache: "no-store"
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { items?: unknown; pagination?: { max_page?: unknown } };
      if (!Array.isArray(payload.items)) return null;
      items.push(...payload.items);
      const lastPage = typeof payload.pagination?.max_page === "number" ? payload.pagination.max_page : page;
      if (page >= lastPage) break;
    }
    return summariseOrders(items);
  } catch {
    return null;
  }
}

function sumFields(counts: Record<string, number> | undefined, keep: (field: string) => boolean = () => true): number {
  return Object.entries(counts ?? {}).reduce((sum, [field, count]) => keep(field) ? sum + count : sum, 0);
}

function totalsByField(daily: DailyCounts, days: readonly string[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const day of days) {
    for (const [field, count] of Object.entries(daily[day] ?? {})) totals.set(field, (totals.get(field) ?? 0) + count);
  }
  return totals;
}

export function buildReport(input: {
  days: string[];
  storage: StatsReport["storage"];
  downloads: DailyCounts | null;
  macs: DailyCounts | null;
  checkouts: DailyCounts | null;
  visits: DayValue[] | null;
  github: GitHubHistory | null;
  appStore?: AppStoreDays | null;
  orders?: OrdersReport | null;
}): StatsReport {
  const { days, downloads, macs, checkouts, appStore } = input;
  const today = days[days.length - 1];
  return {
    days,
    storage: input.storage,
    downloads: downloads && days.map(day => ({
      day,
      stable: sumFields(downloads[day], field => field.startsWith("stable|")),
      beta: sumFields(downloads[day], field => field.startsWith("beta|"))
    })),
    downloadsByVersion: downloads
      ? [...totalsByField(downloads, days)].map(([field, count]) => {
        const [channel, version] = field.split("|");
        return { channel, version: version ?? "unknown", count };
      }).sort((a, b) => b.count - a.count)
      : [],
    macsToday: Object.entries(macs?.[today] ?? {}).map(([version, count]) => ({ version, macs: count }))
      .sort((a, b) => b.macs - a.macs),
    // A Mac that updates during a day is counted under both versions that day.
    macsByDay: macs && days.map(day => ({ day, value: sumFields(macs[day]) })),
    checkoutsByPlan: checkouts
      ? [...totalsByField(checkouts, days)].map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count)
      : [],
    visits: input.visits,
    github: input.github,
    appStore: appStore ? appStoreReport(appStore, days) : null,
    orders: input.orders ?? null
  };
}

function appStoreReport(appStore: AppStoreDays, days: readonly string[]): AppStoreReport {
  const totals = emptyAppStoreDay();
  let latestDay: string | null = null;
  for (const day of days) {
    const summary = appStore[day];
    if (!summary) continue;
    latestDay = day;
    for (const field of Object.keys(totals) as (keyof AppStoreDay)[]) totals[field] += summary[field];
  }
  return {
    daily: days.map(day => ({ day, ios: appStore[day]?.ios ?? 0, mac: appStore[day]?.mac ?? 0 })),
    totals,
    latestDay
  };
}

async function orNull<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch {
    return null;
  }
}

/** How long one gathered report is served, per server instance. */
export const REPORT_CACHE_MS = 5 * 60_000;
let cachedReport: { at: number; report: Promise<StatsReport> } | undefined;

/**
 * The public /stats page's report: gathered at most once per five minutes per instance, so visits to a
 * public page cannot turn into Redis, GoatCounter, GitHub, Polar and Apple calls one for one. Concurrent visits share it.
 */
export function cachedStatsReport(now = Date.now(), load: (now: number) => Promise<StatsReport> = loadStatsReport): Promise<StatsReport> {
  if (cachedReport && now - cachedReport.at < REPORT_CACHE_MS) return cachedReport.report;
  const report = load(now);
  cachedReport = { at: now, report };
  // A failed gather is not kept: the next visit tries again.
  report.catch(() => { if (cachedReport?.report === report) cachedReport = undefined; });
  return report;
}

export async function loadStatsReport(
  now = Date.now(),
  store: SiteStatsStore | null = siteStatsStore()
): Promise<StatsReport> {
  const days = statsDays(now, REPORT_DAYS);
  const [downloads, macs, checkouts, visits, github, appStore, orders] = await Promise.all([
    store ? orNull(store.counts("downloads", days)) : null,
    store ? orNull(store.macs(days)) : null,
    store ? orNull(store.counts("checkouts", days)) : null,
    fetchVisits(explorerAnalyticsConfig(), days, now),
    fetchGitHubHistory(),
    orNull(loadAppStoreDays(getAppStoreSalesConfig(), days, now, store)),
    fetchOrders(getPolarAdminKey(), getPolarApiBaseUrl(), days)
  ]);
  return buildReport({ days, storage: store?.kind ?? "off", downloads, macs, checkouts, visits, github, appStore, orders });
}
