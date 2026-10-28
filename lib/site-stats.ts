import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { after } from "next/server.js";
import { getActivationTokenRedisConfig } from "./env.ts";

/**
 * The site's own counts: downloads, update checks, Macs per app version and checkouts started.
 * Counters are kept per UTC day, for good: they are totals, nothing about a person. No IP address,
 * user agent or cookie is stored: a Mac is counted through a day-salted hash added to a HyperLogLog,
 * and the salt expires with the day.
 */

const DAY_MS = 86_400_000;
const PREFIX = "stats:";
/** How long the per-Mac estimates are kept: a little over a year. Counters and history have no expiry. */
export const STATS_RETENTION_SECONDS = 400 * 24 * 60 * 60;
/** The salt outlives its UTC day only long enough for requests that straddle midnight. */
const SALT_SECONDS = 2 * 24 * 60 * 60;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;
/** What the app's display versions look like: 1.4.0, 1.4.0-b17, 1.4.0-a256. */
const APP_VERSION_PATTERN = /^\d{1,3}\.\d{1,3}(?:\.\d{1,3})?(?:-[ab]\d{1,5})?$/;
/**
 * Update checks are unauthenticated, so the version a client claims is capped: past this many versions
 * in a day, new ones are counted as "other" instead of each making its own Redis keys.
 */
export const MAX_APP_VERSIONS_PER_DAY = 40;
export const OTHER_VERSION = "other";
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|monitor|uptime/i;

export type DownloadChannel = "stable" | "beta";
export type StatsCounter = "downloads" | "update-checks" | "checkouts";
/** UTC day (YYYY-MM-DD) → field → count. */
export type DailyCounts = Record<string, Record<string, number>>;
export type StatsRequest = { ip: string; userAgent: string };

export interface SiteStatsStore {
  readonly kind: "redis" | "memory";
  increment(counter: StatsCounter, day: string, field: string): Promise<void>;
  /** The label to count an app version under today: itself, or "other" once the day's cap is reached. */
  admitVersion(day: string, version: string): Promise<string>;
  /** Counts `member` once per day and admitted version; only an estimate of distinct members is kept. */
  addMac(day: string, version: string, member: string): Promise<void>;
  daySalt(day: string): Promise<string>;
  counts(counter: StatsCounter, days: readonly string[]): Promise<DailyCounts>;
  macs(days: readonly string[]): Promise<DailyCounts>;
  /** History gathered from other sources, as stored JSON by key (a day or a month); missing keys are left out. */
  history(kind: HistoryKind, keys: readonly string[]): Promise<Record<string, string>>;
  /** Kept for good. With `onlyIfAbsent`, an existing value wins (a day's first snapshot stays the day's). */
  saveHistory(kind: HistoryKind, key: string, value: string, options?: { onlyIfAbsent?: boolean }): Promise<void>;
  /** True for the one caller that gets `name` for `seconds`; false while someone else holds it. */
  claim(name: string, seconds: number): Promise<boolean>;
  release(name: string): Promise<void>;
}

/** "app-store": Apple's summaries by day or month. "github-totals": GitHub's download totals, once a day. */
export type HistoryKind = "app-store" | "github-totals";

export function statsDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The last `count` UTC days ending today, oldest first. */
export function statsDays(now: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => statsDay(now - (count - 1 - index) * DAY_MS));
}

/** A label safe to use as a Redis field; anything else is counted as "unknown". */
export function versionLabel(value: string | null | undefined): string {
  return value && VERSION_PATTERN.test(value) ? value : "unknown";
}

export function isLikelyBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** Sparkle sends "<app name>/<display version> Sparkle/<sparkle version>" (SPUUserAgent+Private.m). */
export function sparkleAppVersion(userAgent: string | null): string | null {
  const match = userAgent?.match(/^.+\/(\S+) Sparkle\/\S+$/);
  if (!match) return null;
  return APP_VERSION_PATTERN.test(match[1]) ? match[1] : "unknown";
}

export function statsRequest(headers: Headers): StatsRequest {
  // Vercel overwrites x-real-ip, so a client cannot choose which Mac it is counted as.
  return {
    ip: headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: headers.get("user-agent") ?? ""
  };
}

function macMember(salt: string, request: StatsRequest): string {
  return createHash("sha256").update(`${salt}\n${request.ip}\n${request.userAgent}`).digest("hex").slice(0, 32);
}

/** Counting must never stand between a visitor and their download, checkout or update. */
async function quietly(what: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.warn(`Site stats: ${what} not counted (${error instanceof Error ? error.name : "unknown"})`);
  }
}

export function recordDownload(
  store: SiteStatsStore | null, channel: DownloadChannel, version: string | null, now: number
): Promise<void> {
  if (!store) return Promise.resolve();
  return quietly("download", () => store.increment("downloads", statsDay(now), `${channel}|${versionLabel(version)}`));
}

export function recordCheckout(store: SiteStatsStore | null, plan: string, now: number): Promise<void> {
  if (!store) return Promise.resolve();
  return quietly("checkout", () => store.increment("checkouts", statsDay(now), versionLabel(plan)));
}

/** Runs counting after the response has gone out; nothing it does can reach the response. */
export function afterResponse(work: () => Promise<void>): void {
  const guarded = (): Promise<void> => quietly("after response", work);
  try {
    after(guarded);
  } catch {
    // Outside a request (route unit tests) there is no "after"; count straight away.
    void guarded();
  }
}

/** Counts a checkout once the redirect to Polar has gone out. */
export function countCheckout(plan: string): void {
  const now = Date.now();
  afterResponse(() => recordCheckout(siteStatsStore(), plan, now));
}

/** One update check from Sparkle: the raw check, and this Mac once for the day. */
export function recordUpdateCheck(
  store: SiteStatsStore | null, version: string, request: StatsRequest, now: number
): Promise<void> {
  if (!store) return Promise.resolve();
  const day = statsDay(now);
  return quietly("update check", async () => {
    const [salt, label] = await Promise.all([store.daySalt(day), store.admitVersion(day, version)]);
    await Promise.all([
      store.increment("update-checks", day, label),
      store.addMac(day, label, macMember(salt, request))
    ]);
  });
}

/** HGETALL as Redis answers it (a flat field, value list) or as an object. */
export function hashCounts(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!value || typeof value !== "object") return counts;
  const entries = Array.isArray(value)
    ? Array.from({ length: Math.floor(value.length / 2) }, (_, index) => [String(value[index * 2]), value[index * 2 + 1]])
    : Object.entries(value);
  for (const [field, raw] of entries) {
    const count = Number(raw);
    if (Number.isSafeInteger(count) && count > 0) counts[field] = count;
  }
  return counts;
}

let cachedSalt: { day: string; salt: string } | undefined;

class RedisStatsStore implements SiteStatsStore {
  readonly kind = "redis";
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async increment(counter: StatsCounter, day: string, field: string): Promise<void> {
    const key = `${PREFIX}${counter}:${day}`;
    // persist also lifts the expiry that counters written before 2026-10-29 were given.
    await this.redis.pipeline().hincrby(key, field, 1).persist(key).exec();
  }

  async admitVersion(day: string, version: string): Promise<string> {
    // Atomic, so concurrent checks cannot push the day past its cap.
    const label = await this.redis.eval<[string, number, number, string], unknown>(
      "if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then return ARGV[1] end " +
      "local label = ARGV[1] " +
      "if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[2]) then label = ARGV[4] end " +
      "redis.call('SADD', KEYS[1], label); redis.call('EXPIRE', KEYS[1], ARGV[3]); return label",
      [`${PREFIX}macs-versions:${day}`], [version, MAX_APP_VERSIONS_PER_DAY, STATS_RETENTION_SECONDS, OTHER_VERSION]
    );
    return label === version ? version : OTHER_VERSION;
  }

  async addMac(day: string, version: string, member: string): Promise<void> {
    const key = `${PREFIX}macs:${day}:${version}`;
    await this.redis.pipeline().pfadd(key, member).expire(key, STATS_RETENTION_SECONDS).exec();
  }

  async daySalt(day: string): Promise<string> {
    // One salt per day per instance once read: hourly checks from every Mac need not fetch it each time.
    if (cachedSalt?.day === day) return cachedSalt.salt;
    const key = `${PREFIX}salt:${day}`;
    await this.redis.set(key, randomBytes(16).toString("hex"), { nx: true, ex: SALT_SECONDS });
    const salt = await this.redis.get<string>(key);
    if (typeof salt !== "string" || !salt) throw new Error("Missing day salt");
    cachedSalt = { day, salt };
    return salt;
  }

  async counts(counter: StatsCounter, days: readonly string[]): Promise<DailyCounts> {
    if (days.length === 0) return {};
    const pipeline = this.redis.pipeline();
    for (const day of days) pipeline.hgetall(`${PREFIX}${counter}:${day}`);
    const results = await pipeline.exec<unknown[]>();
    return Object.fromEntries(days.map((day, index) => [day, hashCounts(results[index])]));
  }

  async macs(days: readonly string[]): Promise<DailyCounts> {
    if (days.length === 0) return {};
    const listing = this.redis.pipeline();
    for (const day of days) listing.smembers(`${PREFIX}macs-versions:${day}`);
    const versionsByDay = (await listing.exec<unknown[]>()).map(value =>
      Array.isArray(value) ? value.filter((version): version is string => typeof version === "string") : []);
    const pairs = days.flatMap((day, index) => versionsByDay[index].map(version => ({ day, version })));
    const result: DailyCounts = Object.fromEntries(days.map(day => [day, {}]));
    if (pairs.length === 0) return result;
    const counting = this.redis.pipeline();
    for (const { day, version } of pairs) counting.pfcount(`${PREFIX}macs:${day}:${version}`);
    const counts = await counting.exec<unknown[]>();
    pairs.forEach(({ day, version }, index) => {
      const count = Number(counts[index]);
      if (Number.isSafeInteger(count) && count > 0) result[day][version] = count;
    });
    return result;
  }

  async history(kind: HistoryKind, keys: readonly string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    const stored = await this.redis.mget<unknown[]>(...keys.map(key => `${PREFIX}${kind}:${key}`));
    return Object.fromEntries(keys.flatMap((key, index) =>
      typeof stored[index] === "string" ? [[key, stored[index] as string]] : []));
  }

  async saveHistory(kind: HistoryKind, key: string, value: string, options: { onlyIfAbsent?: boolean } = {}): Promise<void> {
    const redisKey = `${PREFIX}${kind}:${key}`;
    if (options.onlyIfAbsent) await this.redis.set(redisKey, value, { nx: true });
    // A plain set also lifts the expiry that App Store days stored before 2026-10-29 were given.
    else await this.redis.set(redisKey, value);
  }

  async claim(name: string, seconds: number): Promise<boolean> {
    return await this.redis.set(`${PREFIX}lock:${name}`, "1", { nx: true, ex: seconds }) === "OK";
  }

  async release(name: string): Promise<void> {
    await this.redis.del(`${PREFIX}lock:${name}`);
  }
}

/** The local dev server's store; exact sets stand in for HyperLogLogs. */
export class MemoryStatsStore implements SiteStatsStore {
  readonly kind = "memory";
  private readonly counters = new Map<string, Map<string, number>>();
  private readonly macSets = new Map<string, Map<string, Set<string>>>();
  private readonly salts = new Map<string, string>();
  private readonly admitted = new Map<string, Set<string>>();
  private readonly stored = new Map<string, string>();
  private readonly claims = new Map<string, number>();

  async increment(counter: StatsCounter, day: string, field: string): Promise<void> {
    const key = `${counter}:${day}`;
    const fields = this.counters.get(key) ?? new Map<string, number>();
    fields.set(field, (fields.get(field) ?? 0) + 1);
    this.counters.set(key, fields);
  }

  async admitVersion(day: string, version: string): Promise<string> {
    const admitted = this.admitted.get(day) ?? new Set<string>();
    this.admitted.set(day, admitted);
    if (admitted.has(version)) return version;
    const label = admitted.size >= MAX_APP_VERSIONS_PER_DAY ? OTHER_VERSION : version;
    admitted.add(label);
    return label;
  }

  async addMac(day: string, version: string, member: string): Promise<void> {
    const versions = this.macSets.get(day) ?? new Map<string, Set<string>>();
    const members = versions.get(version) ?? new Set<string>();
    members.add(member);
    versions.set(version, members);
    this.macSets.set(day, versions);
  }

  async daySalt(day: string): Promise<string> {
    const salt = this.salts.get(day) ?? randomBytes(16).toString("hex");
    this.salts.set(day, salt);
    return salt;
  }

  async counts(counter: StatsCounter, days: readonly string[]): Promise<DailyCounts> {
    return Object.fromEntries(days.map(day => [day, Object.fromEntries(this.counters.get(`${counter}:${day}`) ?? [])]));
  }

  async macs(days: readonly string[]): Promise<DailyCounts> {
    return Object.fromEntries(days.map(day => [day, Object.fromEntries(
      [...(this.macSets.get(day) ?? new Map<string, Set<string>>())].map(([version, members]) => [version, members.size])
    )]));
  }

  async history(kind: HistoryKind, keys: readonly string[]): Promise<Record<string, string>> {
    return Object.fromEntries(keys.flatMap(key => {
      const value = this.stored.get(`${kind}:${key}`);
      return value === undefined ? [] : [[key, value]];
    }));
  }

  async saveHistory(kind: HistoryKind, key: string, value: string, options: { onlyIfAbsent?: boolean } = {}): Promise<void> {
    if (options.onlyIfAbsent && this.stored.has(`${kind}:${key}`)) return;
    this.stored.set(`${kind}:${key}`, value);
  }

  async claim(name: string, seconds: number): Promise<boolean> {
    const now = Date.now();
    if ((this.claims.get(name) ?? 0) > now) return false;
    this.claims.set(name, now + seconds * 1000);
    return true;
  }

  async release(name: string): Promise<void> {
    this.claims.delete(name);
  }
}

const devStoreKey = Symbol.for("localaicat.siteStats.devStore");

/**
 * Redis (the Upstash database the checkout quotas use) when deployed. The local dev server always counts
 * in memory, even with Redis credentials in its env, so trying the site never writes to production counts.
 */
export function siteStatsStore(): SiteStatsStore | null {
  if (process.env.NODE_ENV === "development") {
    const holder = globalThis as typeof globalThis & { [devStoreKey]?: MemoryStatsStore };
    holder[devStoreKey] ??= new MemoryStatsStore();
    return holder[devStoreKey];
  }
  const config = getActivationTokenRedisConfig();
  if (!config) return null;
  try {
    // Raw strings back: a salt that happens to look like a number must stay a string.
    return new RedisStatsStore(new Redis({ ...config, automaticDeserialization: false }));
  } catch {
    // A malformed Redis URL turns counting off; it must not turn the redirect into an error.
    return null;
  }
}

