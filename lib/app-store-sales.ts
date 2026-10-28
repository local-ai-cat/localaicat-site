import { createSign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { SiteStatsStore } from "./site-stats.ts";
import { HISTORY_START_MONTH, addMonths, lastDays, monthsBetween, utcDay } from "./stats-range.ts";

/**
 * Local AI Chat's App Store units, from Apple's sales summaries (Sales and Trends): monthly reports for the
 * whole history since launch, daily ones for recent days. Units only: the report's prices and proceeds are
 * never read into the summary. The vendor's report covers every app on the team, so rows are kept by Local AI
 * Chat's Apple ID and, for in-app purchases, its SKU.
 */

export const LOCAL_AI_CHAT_APP_ID = "6741502386";
export const LOCAL_AI_CHAT_SKU = "pldev.Seek-Deep-Local-AI";
const SALES_REPORTS_URL = "https://api.appstoreconnect.apple.com/v1/salesReports";
/** Apple allows tokens up to 20 minutes; one fill needs far less. */
const TOKEN_SECONDS = 10 * 60;
/** Days kept day by day: enough for the 90-day view. Older history is kept by month. */
export const APP_STORE_DAILY_DAYS = 90;
/**
 * Apple publishes a day's report the next morning, Pacific time, and a month's in the first days of the next.
 * A period this long past with no report had no units, and is stored as zero; a younger one is asked again.
 */
const SETTLED_DAYS = 3;
const SETTLED_MONTH_DAYS = 10;
const DAY_MS = 86_400_000;
const FETCH_CONCURRENCY = 6;
/** Reports asked of Apple per fill: the whole backfill since launch fits in one. A fill runs after a page view, one at a time. */
export const FILL_BATCH = 120;
const FILL_LOCK = "app-store-fill";
const FILL_LOCK_SECONDS = 5 * 60;
const SOURCE_TIMEOUT_MS = 10_000;

/** Product type identifiers from Apple's Sales and Trends guide. Mac types start with F. */
const FIRST_DOWNLOAD_TYPES = new Set(["1", "1F", "1T", "1E", "1EP", "1EU", "1-B", "F1", "F1-B"]);
const REDOWNLOAD_TYPES = new Set(["3", "3F", "3T", "F3"]);
const UPDATE_TYPES = new Set(["7", "7F", "7T", "F7"]);

export type AppStoreSalesConfig = { keyId: string; issuerId: string; vendorNumber: string; privateKey: string };
/** One day's or one month's units. */
export type AppStoreDay = { ios: number; mac: number; redownloads: number; updates: number; purchases: number };
/** Period (a day or a month) → its stored summary; periods not fetched yet are left out. */
export type AppStoreHistory = Record<string, AppStoreDay>;

export function emptyAppStoreDay(): AppStoreDay {
  return { ios: 0, mac: 0, redownloads: 0, updates: 0, purchases: 0 };
}

function isPurchaseType(type: string): boolean {
  return type.startsWith("IA") || type === "FI1";
}

/**
 * Sums one daily SUMMARY report (tab-separated, header first) into Local AI Chat's units. Null when the
 * report lacks the columns it needs, so a malformed answer is asked again rather than stored as zero.
 */
export function summariseSalesReport(tsv: string, appId = LOCAL_AI_CHAT_APP_ID, sku = LOCAL_AI_CHAT_SKU): AppStoreDay | null {
  const [header, ...lines] = tsv.split(/\r?\n/).filter(line => line.trim() !== "");
  const columns = (header ?? "").split("\t");
  const column = (name: string): number => columns.indexOf(name);
  const typeAt = column("Product Type Identifier");
  const unitsAt = column("Units");
  const appAt = column("Apple Identifier");
  const parentAt = column("Parent Identifier");
  const deviceAt = column("Device");
  const day = emptyAppStoreDay();
  if (typeAt < 0 || unitsAt < 0 || appAt < 0) return null;
  for (const line of lines) {
    const cells = line.split("\t");
    const type = cells[typeAt]?.trim() ?? "";
    // Refunds come as negative units, and are counted against the day they land on.
    const units = Number.parseInt(cells[unitsAt] ?? "", 10);
    if (!Number.isSafeInteger(units)) continue;
    if (cells[appAt]?.trim() === appId) {
      if (FIRST_DOWNLOAD_TYPES.has(type)) {
        const onMac = type.startsWith("F") || cells[deviceAt]?.trim() === "Desktop";
        if (onMac) day.mac += units;
        else day.ios += units;
      } else if (REDOWNLOAD_TYPES.has(type)) {
        day.redownloads += units;
      } else if (UPDATE_TYPES.has(type)) {
        day.updates += units;
      }
    } else if (isPurchaseType(type) && parentAt >= 0 && cells[parentAt]?.trim() === sku) {
      day.purchases += units;
    }
  }
  return day;
}

/** The ES256 bearer token App Store Connect asks for. */
export function appStoreToken(config: AppStoreSalesConfig, now: number): string {
  const issuedAt = Math.floor(now / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: config.keyId, typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: config.issuerId, iat: issuedAt, exp: issuedAt + TOKEN_SECONDS, aud: "appstoreconnect-v1"
  })).toString("base64url");
  const signature = createSign("SHA256").update(`${header}.${claims}`)
    .sign({ key: config.privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${signature.toString("base64url")}`;
}

/**
 * One period's report (a day, "2026-10-27", or a month, "2026-09"): its summary, "none" when Apple has no
 * report for it, or null when the call failed.
 */
async function fetchSalesReport(config: AppStoreSalesConfig, token: string, period: string): Promise<AppStoreDay | "none" | null> {
  const url = new URL(SALES_REPORTS_URL);
  url.searchParams.set("filter[frequency]", isMonth(period) ? "MONTHLY" : "DAILY");
  url.searchParams.set("filter[reportType]", "SALES");
  url.searchParams.set("filter[reportSubType]", "SUMMARY");
  url.searchParams.set("filter[version]", "1_1");
  url.searchParams.set("filter[vendorNumber]", config.vendorNumber);
  url.searchParams.set("filter[reportDate]", period);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" },
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store"
    });
    if (response.status === 404) return "none";
    if (!response.ok) return null;
    return summariseSalesReport(gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8"));
  } catch {
    return null;
  }
}

function storedDay(json: string): AppStoreDay | null {
  try {
    const value = JSON.parse(json) as Partial<AppStoreDay>;
    const day = emptyAppStoreDay();
    for (const field of Object.keys(day) as (keyof AppStoreDay)[]) {
      if (!Number.isSafeInteger(value[field])) return null;
      day[field] = value[field] as number;
    }
    return day;
  } catch {
    return null;
  }
}

function isMonth(period: string): boolean {
  return period.length === 7;
}

/** Every period worth keeping: the last 90 days but today, and every finished month since launch. */
export function appStorePeriods(now: number): string[] {
  const today = utcDay(now);
  const days = lastDays(now, APP_STORE_DAILY_DAYS + 1).filter(day => day < today);
  const months = monthsBetween(HISTORY_START_MONTH, addMonths(today.slice(0, 7), -1));
  return [...months, ...days];
}

/** What is stored so far; a value that doesn't read back as a summary is left out, so it is fetched again. */
export async function readAppStoreHistory(store: SiteStatsStore, now: number): Promise<AppStoreHistory> {
  const stored = await store.history("app-store", appStorePeriods(now));
  const history: AppStoreHistory = {};
  for (const [period, json] of Object.entries(stored)) {
    const summary = storedDay(json);
    if (summary) history[period] = summary;
  }
  return history;
}

/** Whether Apple has had time to publish the period, so that no report means no units. */
function settled(period: string, now: number): boolean {
  if (!isMonth(period)) return period < utcDay(now - SETTLED_DAYS * DAY_MS);
  const monthEnd = Date.parse(`${addMonths(period, 1)}-01T00:00:00Z`);
  return now - monthEnd > SETTLED_MONTH_DAYS * DAY_MS;
}

/**
 * Asks Apple for up to FILL_BATCH periods not stored yet, newest first, and stores each settled answer for
 * good, so every period costs Apple one call. Meant to run after a response: one fill at a time across all
 * instances, and the page never waits for it. Returns how many periods were stored.
 */
export async function fillAppStoreHistory(
  config: AppStoreSalesConfig | null,
  store: SiteStatsStore | null,
  now: number
): Promise<number> {
  if (!config || !store) return 0;
  const history = await readAppStoreHistory(store, now);
  const missing = appStorePeriods(now).filter(period => !(period in history)).reverse().slice(0, FILL_BATCH);
  if (missing.length === 0) return 0;
  let token: string;
  try {
    token = appStoreToken(config, now);
  } catch {
    // A malformed key stores nothing rather than failing anything.
    return 0;
  }
  const lease = await store.claim(FILL_LOCK, FILL_LOCK_SECONDS);
  if (!lease) return 0;
  let saved = 0;
  // Each period settles on its own, so no write is still running when the lock is let go.
  const fillOne = async (period: string): Promise<void> => {
    try {
      const answer = await fetchSalesReport(config, token, period);
      if (answer === null || (answer === "none" && !settled(period, now))) return;
      const summary = answer === "none" ? emptyAppStoreDay() : answer;
      await store.saveHistory("app-store", period, JSON.stringify(summary));
      saved += 1;
    } catch {
      // A failed write is asked again by the next fill.
    }
  };
  for (let start = 0; start < missing.length; start += FETCH_CONCURRENCY) {
    await Promise.all(missing.slice(start, start + FETCH_CONCURRENCY).map(fillOne));
  }
  // Only this fill's own lease is let go; a fill that outlived it cannot free a later fill's lock.
  await store.release(FILL_LOCK, lease).catch(() => undefined);
  return saved;
}

function addUnits(total: AppStoreDay, more: AppStoreDay): void {
  for (const field of Object.keys(total) as (keyof AppStoreDay)[]) total[field] += more[field];
}

/**
 * A bucket's units: a day's own summary; for a month, Apple's monthly report when there is one, else the sum
 * of the month's stored days (this month, or a month Apple hasn't reported yet). Null when nothing is known.
 */
export function appStoreUnits(history: AppStoreHistory, bucket: { key: string; days: readonly string[] }): AppStoreDay | null {
  if (history[bucket.key]) return history[bucket.key];
  if (!isMonth(bucket.key)) return null;
  const known = bucket.days.filter(day => history[day]);
  if (known.length === 0) return null;
  const total = emptyAppStoreDay();
  for (const day of known) addUnits(total, history[day]);
  return total;
}

/** Units over several buckets; buckets with nothing known count as zero. */
export function sumAppStoreUnits(history: AppStoreHistory, buckets: readonly { key: string; days: readonly string[] }[]): AppStoreDay {
  const total = emptyAppStoreDay();
  for (const bucket of buckets) {
    const units = appStoreUnits(history, bucket);
    if (units) addUnits(total, units);
  }
  return total;
}

/** The newest day with a stored report, for "Apple's latest day" on the page. */
export function latestAppStoreDay(history: AppStoreHistory): string | null {
  const days = Object.keys(history).filter(period => !isMonth(period)).sort();
  return days.at(-1) ?? null;
}
