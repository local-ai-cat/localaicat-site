import {
  appStoreUnits,
  fillAppStoreHistory,
  unsplitAppStoreUnits,
  latestAppStoreDay,
  readAppStoreHistory,
  sumAppStoreUnits,
  type AppStoreDay,
  type AppStoreHistory,
  type AppStoreSalesConfig
} from "./app-store-sales.ts";
import { getAppStoreSalesConfig, getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import { explorerAnalyticsConfig, type ExplorerAnalyticsConfig } from "./explorer-presence.ts";
import { afterResponse, siteStatsStore, type DailyCounts, type SiteStatsStore } from "./site-stats.ts";
import { rangeBuckets, utcDay, type Bucket, type RangeBuckets, type StatsRange } from "./stats-range.ts";

/**
 * Everything /stats shows for one range, gathered on the server. Each source can be missing on its own.
 * Totals only: no amount of money, no person, no address.
 */

/** The site began counting downloads, update checks and checkouts itself on this day. */
export const COUNTING_STARTED = "2026-10-28";
/** GitHub keeps only running totals; the site has written them down once a day since this day. */
export const GITHUB_SNAPSHOTS_STARTED = "2026-10-29";
/** Longer than the old 400-day counter expiry, so lifting it runs once and never again. */
const KEEP_COUNTERS_LEASE_SECONDS = 500 * 24 * 60 * 60;
const RELEASES_URL = "https://api.github.com/repos/local-ai-cat/localaicat-site/releases";
const RELEASE_PAGES = 5;
const SOURCE_TIMEOUT_MS = 8_000;
/** The stable DMG the site, Homebrew and first installs fetch; Sparkle updates fetch the versioned one. */
const PLAIN_DMG = "LocalAIChatDirect.dmg";

export type ReleaseChannel = "stable" | "beta" | "alpha";
export type GitHubRelease = { tag: string; publishedAt: string | null; dmgDownloads: number };
export type GitHubHistory = {
  channels: { channel: ReleaseChannel; releases: number; dmgDownloads: number }[];
  topStable: GitHubRelease[];
  /** Stable plain-DMG downloads: new installs. */
  newDownloads: number;
  /** Stable versioned-DMG downloads: mostly Sparkle updating an installed app. */
  updateDownloads: number;
  /** The first direct release's day: a range starting by then holds every direct download. */
  firstRelease: string | null;
};
/** The running totals written down once a day, to turn GitHub's totals into downloads per day. */
export type GitHubTotals = { new: number; updates: number; beta: number; alpha: number };
export type BucketValue = { key: string; value: number };
/** Polar orders in the range, as counts: a first order (purchase or new subscription), and renewals. */
export type OrdersReport = {
  newPaid: number;
  newFree: number;
  renewals: number;
  /** First orders (paid or free) by UTC day, for the chart. */
  firstByDay: Record<string, number>;
};
export type StatsReport = {
  range: StatsRange;
  granularity: RangeBuckets["granularity"];
  buckets: string[];
  storage: "redis" | "memory" | "off";
  allTime: { downloads: number | null; appStore: number | null; direct: number | null; directUpdates: number | null };
  /** Per bucket: App Store first downloads and direct (plain DMG) downloads; direct is null before the snapshots. */
  /** `unsplit`: App Store first downloads known only as a month's total, from the seed. */
  downloads: { key: string; ios: number; mac: number; unsplit: number; direct: number | null }[];
  appStore: { units: AppStoreDay; unsplit: number; latestDay: string | null } | null;
  direct: number | null;
  siteClicks: { key: string; stable: number; beta: number }[] | null;
  downloadsByVersion: { channel: string; version: string; count: number }[];
  macsToday: { version: string; macs: number }[];
  /** Distinct Macs a day; for a month, its busiest day. */
  macs: BucketValue[] | null;
  checkoutsByPlan: { plan: string; count: number }[];
  /** Checkouts started per bucket (counted from 2026-10-28), and first Polar orders per bucket. */
  checkouts: BucketValue[] | null;
  firstOrders: BucketValue[] | null;
  visits: BucketValue[] | null;
  orders: OrdersReport | null;
  github: GitHubHistory | null;
};

export function releaseChannel(tag: string): ReleaseChannel {
  if (/-a\d+$/.test(tag)) return "alpha";
  if (/-b\d+$/.test(tag)) return "beta";
  return "stable";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** GitHub's per-file totals (no dates): the only direct-download history from before the site counted. */
export function summariseReleases(raw: unknown[]): GitHubHistory {
  const releases: (GitHubRelease & { channel: ReleaseChannel })[] = [];
  let newDownloads = 0;
  let updateDownloads = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const release = item as { tag_name?: unknown; published_at?: unknown; draft?: unknown; assets?: unknown };
    if (typeof release.tag_name !== "string" || release.draft === true) continue;
    const channel = releaseChannel(release.tag_name);
    const assets = (Array.isArray(release.assets) ? release.assets : []) as { name?: unknown; download_count?: unknown }[];
    let dmgDownloads = 0;
    for (const asset of assets) {
      if (typeof asset?.name !== "string" || !asset.name.endsWith(".dmg") || !isCount(asset.download_count)) continue;
      dmgDownloads += asset.download_count;
      if (channel !== "stable") continue;
      if (asset.name === PLAIN_DMG) newDownloads += asset.download_count;
      else updateDownloads += asset.download_count;
    }
    releases.push({
      tag: release.tag_name,
      publishedAt: typeof release.published_at === "string" ? release.published_at.slice(0, 10) : null,
      dmgDownloads,
      channel
    });
  }
  const channels = (["stable", "beta", "alpha"] as const).map(channel => {
    const inChannel = releases.filter(release => release.channel === channel);
    return { channel, releases: inChannel.length, dmgDownloads: inChannel.reduce((sum, r) => sum + r.dmgDownloads, 0) };
  });
  const topStable = releases.filter(release => release.channel === "stable")
    .sort((a, b) => b.dmgDownloads - a.dmgDownloads).slice(0, 5)
    .map(({ tag, publishedAt, dmgDownloads }) => ({ tag, publishedAt, dmgDownloads }));
  const published = releases.flatMap(release => release.publishedAt ? [release.publishedAt] : []).sort();
  return { channels, topStable, newDownloads, updateDownloads, firstRelease: published[0] ?? null };
}

export function githubTotals(history: GitHubHistory): GitHubTotals {
  const channel = (name: ReleaseChannel): number => history.channels.find(entry => entry.channel === name)?.dmgDownloads ?? 0;
  return { new: history.newDownloads, updates: history.updateDownloads, beta: channel("beta"), alpha: channel("alpha") };
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

function storedTotals(json: string | undefined): GitHubTotals | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Partial<GitHubTotals>;
    return isCount(value.new) && isCount(value.updates) && isCount(value.beta) && isCount(value.alpha) ? value as GitHubTotals : null;
  } catch {
    return null;
  }
}

/**
 * Plain-DMG downloads per day, from the totals written down each day: the next day's total minus the day's
 * (today: the live total minus this morning's). Null for a day without both ends; never below zero, since a
 * re-uploaded file starts its count again.
 */
export function directPerDay(
  snapshots: Record<string, string>,
  days: readonly string[],
  today: string,
  live: GitHubTotals | null
): Map<string, number> {
  const perDay = new Map<string, number>();
  const dayAfter = (day: string): string => utcDay(Date.parse(`${day}T00:00:00Z`) + 86_400_000);
  for (const day of days) {
    const start = storedTotals(snapshots[day]);
    const end = day === today ? live : storedTotals(snapshots[dayAfter(day)]);
    if (start && end) perDay.set(day, Math.max(0, end.new - start.new));
  }
  return perDay;
}

/** GoatCounter's daily visitors by day. */
export function dailyVisits(payload: unknown): Map<string, number> | null {
  if (!payload || typeof payload !== "object") return null;
  const stats = (payload as { stats?: unknown }).stats;
  if (!Array.isArray(stats)) return null;
  const byDay = new Map<string, number>();
  for (const entry of stats) {
    const { day, daily } = (entry ?? {}) as { day?: unknown; daily?: unknown };
    if (typeof day === "string" && isCount(daily)) byDay.set(day.slice(0, 10), daily);
  }
  return byDay;
}

async function fetchVisits(config: ExplorerAnalyticsConfig | null, firstDay: string, now: number): Promise<Map<string, number> | null> {
  if (!config) return null;
  const url = new URL(`https://${config.site}.goatcounter.com/api/v0/stats/total`);
  url.searchParams.set("start", `${firstDay}T00:00:00Z`);
  // Both ends are inclusive hour buckets; the current hour is the last one with data.
  url.searchParams.set("end", new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"));
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store"
    });
    return response.ok ? dailyVisits(await response.json()) : null;
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
  const report: OrdersReport = { newPaid: 0, newFree: 0, renewals: 0, firstByDay: {} };
  for (const item of items) {
    const { paid, billing_reason: reason, total_amount: total, created_at: created } = (item ?? {}) as {
      paid?: unknown; billing_reason?: unknown; total_amount?: unknown; created_at?: unknown;
    };
    if (paid !== true || typeof reason !== "string") continue;
    if (FIRST_ORDER_REASONS.has(reason)) {
      if (typeof total === "number" && total > 0) report.newPaid += 1;
      else report.newFree += 1;
      if (typeof created === "string" && /^\d{4}-\d{2}-\d{2}/.test(created)) {
        const day = created.slice(0, 10);
        report.firstByDay[day] = (report.firstByDay[day] ?? 0) + 1;
      }
    } else if (reason === "subscription_cycle") {
      report.renewals += 1;
    }
  }
  return report;
}

/** The range's orders, read with the site's Polar key (orders:read). */
async function fetchOrders(adminKey: string | null, apiBase: string, firstDay: string): Promise<OrdersReport | null> {
  if (!adminKey) return null;
  const items: unknown[] = [];
  try {
    for (let page = 1; page <= ORDER_PAGES; page += 1) {
      const url = new URL(`${apiBase}/v1/orders/`);
      url.searchParams.set("created_after", `${firstDay}T00:00:00Z`);
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
      // Past the page cap a total would be short, so none is shown rather than a wrong one.
      if (page >= lastPage) return summariseOrders(items);
    }
    return null;
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

function sumDays(perDay: Map<string, number>, bucket: Bucket): number {
  return bucket.days.reduce((sum, day) => sum + (perDay.get(day) ?? 0), 0);
}

export function buildReport(input: {
  range: RangeBuckets;
  now: number;
  storage: StatsReport["storage"];
  downloads: DailyCounts | null;
  macs: DailyCounts | null;
  checkouts: DailyCounts | null;
  visits: Map<string, number> | null;
  github: GitHubHistory | null;
  snapshots: Record<string, string> | null;
  appStore: AppStoreHistory | null;
  orders: OrdersReport | null;
}): StatsReport {
  const { range, downloads, macs, checkouts, appStore, github } = input;
  const today = utcDay(input.now);
  const { buckets, days } = range;
  const live = github ? githubTotals(github) : null;
  const direct = input.snapshots ? directPerDay(input.snapshots, days, today, live) : new Map<string, number>();
  const directKnown = (bucket: Bucket): boolean => bucket.days.some(day => direct.has(day));
  /** A range reaching back to the first direct release holds all of GitHub's total; otherwise the days written down. */
  const directInRange = (): number | null => {
    if (github?.firstRelease && days[0] <= github.firstRelease) return github.newDownloads;
    return buckets.some(directKnown) ? days.reduce((sum, day) => sum + (direct.get(day) ?? 0), 0) : null;
  };

  const allBuckets = rangeBuckets("all", input.now).buckets;
  const allTimeAppStore = appStore ? sumAppStoreUnits(appStore, allBuckets) : null;
  const allTimeApp = allTimeAppStore
    ? allTimeAppStore.ios + allTimeAppStore.mac + allBuckets.reduce((sum, bucket) => sum + unsplitAppStoreUnits(bucket), 0)
    : null;
  const allTimeDirect = github?.newDownloads ?? null;
  const anyAllTime = allTimeApp !== null || allTimeDirect !== null;

  return {
    range: range.range,
    granularity: range.granularity,
    buckets: buckets.map(bucket => bucket.key),
    storage: input.storage,
    allTime: {
      downloads: anyAllTime ? (allTimeApp ?? 0) + (allTimeDirect ?? 0) : null,
      appStore: allTimeApp,
      direct: allTimeDirect,
      directUpdates: github?.updateDownloads ?? null
    },
    downloads: buckets.map(bucket => {
      const units = appStore ? appStoreUnits(appStore, bucket) : null;
      return {
        key: bucket.key,
        ios: units?.ios ?? 0,
        mac: units?.mac ?? 0,
        unsplit: appStore ? unsplitAppStoreUnits(bucket) : 0,
        direct: directKnown(bucket) ? sumDays(direct, bucket) : null
      };
    }),
    appStore: appStore ? {
      units: sumAppStoreUnits(appStore, buckets),
      unsplit: buckets.reduce((sum, bucket) => sum + unsplitAppStoreUnits(bucket), 0),
      latestDay: latestAppStoreDay(appStore)
    } : null,
    direct: directInRange(),
    siteClicks: downloads && buckets.map(bucket => ({
      key: bucket.key,
      stable: bucket.days.reduce((sum, day) => sum + sumFields(downloads[day], field => field.startsWith("stable|")), 0),
      beta: bucket.days.reduce((sum, day) => sum + sumFields(downloads[day], field => field.startsWith("beta|")), 0)
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
    macs: macs && buckets.map(bucket => ({ key: bucket.key, value: Math.max(0, ...bucket.days.map(day => sumFields(macs[day]))) })),
    checkoutsByPlan: checkouts
      ? [...totalsByField(checkouts, days)].map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count)
      : [],
    visits: input.visits && buckets.map(bucket => ({ key: bucket.key, value: sumDays(input.visits as Map<string, number>, bucket) })),
    checkouts: checkouts && buckets.map(bucket => ({
      key: bucket.key,
      value: bucket.days.reduce((sum, day) => sum + sumFields(checkouts[day]), 0)
    })),
    firstOrders: input.orders && buckets.map(bucket => ({
      key: bucket.key,
      value: bucket.days.reduce((sum, day) => sum + (input.orders?.firstByDay[day] ?? 0), 0)
    })),
    orders: input.orders,
    github
  };
}

async function orNull<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch {
    return null;
  }
}

/** How long one gathered report is served, per server instance and range. */
export const REPORT_CACHE_MS = 5 * 60_000;
const cachedReports = new Map<StatsRange, { at: number; report: Promise<StatsReport> }>();

/**
 * The public /stats page's report: gathered at most once per five minutes per instance and range, so visits
 * to a public page cannot turn into Redis, GoatCounter, GitHub, Polar and Apple calls one for one.
 * Concurrent visits share it.
 */
export function cachedStatsReport(
  range: StatsRange,
  now = Date.now(),
  load: (range: StatsRange, now: number) => Promise<StatsReport> = loadStatsReport
): Promise<StatsReport> {
  const cached = cachedReports.get(range);
  if (cached && now - cached.at < REPORT_CACHE_MS) return cached.report;
  const report = load(range, now);
  cachedReports.set(range, { at: now, report });
  // A failed gather is not kept: the next visit tries again.
  report.catch(() => { if (cachedReports.get(range)?.report === report) cachedReports.delete(range); });
  return report;
}

export type ReportDeps = {
  store?: SiteStatsStore | null;
  appStoreConfig?: AppStoreSalesConfig | null;
  /** Work for after the response: the App Store backfill and today's GitHub totals. */
  schedule?: (work: () => Promise<void>) => void;
};

export async function loadStatsReport(range: StatsRange, now = Date.now(), deps: ReportDeps = {}): Promise<StatsReport> {
  const store = deps.store === undefined ? siteStatsStore() : deps.store;
  const appStoreConfig = deps.appStoreConfig === undefined ? getAppStoreSalesConfig() : deps.appStoreConfig;
  const schedule = deps.schedule ?? afterResponse;
  const buckets = rangeBuckets(range, now);
  const today = utcDay(now);
  const countedDays = buckets.days.filter(day => day >= COUNTING_STARTED);
  const snapshotDays = buckets.days.filter(day => day >= GITHUB_SNAPSHOTS_STARTED);
  const [downloads, macs, checkouts, visits, github, snapshots, appStore, orders] = await Promise.all([
    store ? orNull(store.counts("downloads", countedDays)) : null,
    store ? orNull(store.macs(countedDays)) : null,
    store ? orNull(store.counts("checkouts", countedDays)) : null,
    fetchVisits(explorerAnalyticsConfig(), buckets.days[0], now),
    fetchGitHubHistory(),
    store ? orNull(store.history("github-totals", snapshotDays)) : null,
    store && appStoreConfig ? orNull(readAppStoreHistory(store, now)) : null,
    fetchOrders(getPolarAdminKey(), getPolarApiBaseUrl(), buckets.days[0])
  ]);
  if (store) {
    schedule(async () => {
      // The day's first totals stay the day's, so each day's downloads are measured from the same point.
      if (github) {
        await orNull(store.saveHistory("github-totals", today, JSON.stringify(githubTotals(github)), { onlyIfAbsent: true }));
      }
      // Once: counters written before they were kept for good still carry an expiry.
      const keepLease = await orNull(store.claim("counters-kept", KEEP_COUNTERS_LEASE_SECONDS));
      if (keepLease) {
        const kept = await orNull(store.keepCounters(rangeBuckets("all", now).days.filter(day => day >= COUNTING_STARTED)).then(() => true));
        // A failed run lets go, so the next view tries again.
        if (!kept) await orNull(store.release("counters-kept", keepLease));
      }
      await fillAppStoreHistory(appStoreConfig, store, now);
    });
  }
  return buildReport({
    range: buckets, now, storage: store?.kind ?? "off", downloads, macs, checkouts, visits, github, snapshots, appStore, orders
  });
}
