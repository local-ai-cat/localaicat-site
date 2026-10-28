import { createSign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { SiteStatsStore } from "./site-stats.ts";

/**
 * Local AI Chat's App Store units per day, from Apple's daily sales summaries (Sales and Trends). Units only:
 * the report's prices and proceeds are never read into the summary. The vendor's report covers every app on
 * the team, so rows are kept by Local AI Chat's Apple ID and, for in-app purchases, its SKU.
 */

export const LOCAL_AI_CHAT_APP_ID = "6741502386";
export const LOCAL_AI_CHAT_SKU = "pldev.Seek-Deep-Local-AI";
const SALES_REPORTS_URL = "https://api.appstoreconnect.apple.com/v1/salesReports";
/** Apple allows tokens up to 20 minutes; one gather needs far less. */
const TOKEN_SECONDS = 5 * 60;
/**
 * Apple publishes a day's report the next morning, Pacific time. A day this many days back with no report
 * had no units, and is stored as zero; a younger one is asked about again on the next gather.
 */
const SETTLED_DAYS = 3;
const DAY_MS = 86_400_000;
const FETCH_CONCURRENCY = 6;
const SOURCE_TIMEOUT_MS = 8_000;

/** Product type identifiers from Apple's Sales and Trends guide. Mac types start with F. */
const FIRST_DOWNLOAD_TYPES = new Set(["1", "1F", "1T", "1E", "1EP", "1EU", "1-B", "F1", "F1-B"]);
const REDOWNLOAD_TYPES = new Set(["3", "3F", "3T", "F3"]);
const UPDATE_TYPES = new Set(["7", "7F", "7T", "F7"]);

export type AppStoreSalesConfig = { keyId: string; issuerId: string; vendorNumber: string; privateKey: string };
export type AppStoreDay = { ios: number; mac: number; redownloads: number; updates: number; purchases: number };
/** Day → its summary, or null while Apple hasn't published it (or didn't answer). */
export type AppStoreDays = Record<string, AppStoreDay | null>;

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

/** One day's report: its summary, "none" when Apple has no report for it, or null when the call failed. */
async function fetchSalesDay(config: AppStoreSalesConfig, token: string, day: string): Promise<AppStoreDay | "none" | null> {
  const url = new URL(SALES_REPORTS_URL);
  url.searchParams.set("filter[frequency]", "DAILY");
  url.searchParams.set("filter[reportType]", "SALES");
  url.searchParams.set("filter[reportSubType]", "SUMMARY");
  url.searchParams.set("filter[version]", "1_1");
  url.searchParams.set("filter[vendorNumber]", config.vendorNumber);
  url.searchParams.set("filter[reportDate]", day);
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

/**
 * The window's App Store days. Days already stored are read from the store; the rest are asked of Apple,
 * a few at a time, and stored once settled, so each past day costs Apple one call. Today is never asked.
 */
export async function loadAppStoreDays(
  config: AppStoreSalesConfig | null,
  days: readonly string[],
  now: number,
  store: SiteStatsStore | null
): Promise<AppStoreDays | null> {
  if (!config) return null;
  const result: AppStoreDays = Object.fromEntries(days.map(day => [day, null]));
  const stored = store ? await store.appStoreDays(days).catch(() => ({} as Record<string, string>)) : {};
  for (const [day, json] of Object.entries(stored)) result[day] = storedDay(json);
  const today = new Date(now).toISOString().slice(0, 10);
  const missing = days.filter(day => result[day] === null && day < today);
  if (missing.length === 0) return result;
  let token: string;
  try {
    token = appStoreToken(config, now);
  } catch {
    // A malformed key leaves the section empty rather than failing the page.
    return result;
  }
  const settledBefore = new Date(now - SETTLED_DAYS * DAY_MS).toISOString().slice(0, 10);
  for (let start = 0; start < missing.length; start += FETCH_CONCURRENCY) {
    await Promise.all(missing.slice(start, start + FETCH_CONCURRENCY).map(async day => {
      const answer = await fetchSalesDay(config, token, day);
      if (answer === null) return;
      if (answer === "none" && day >= settledBefore) return;
      const summary = answer === "none" ? emptyAppStoreDay() : answer;
      result[day] = summary;
      await store?.saveAppStoreDay(day, JSON.stringify(summary)).catch(() => undefined);
    }));
  }
  return result;
}
