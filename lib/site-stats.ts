import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { after } from "next/server.js";
import { getActivationTokenRedisConfig } from "./env.ts";

/**
 * The site's own counts: downloads, update checks, Macs per app version and checkouts started.
 * Counters are kept per UTC day. No IP address, user agent or cookie is stored: a Mac is counted
 * through a day-salted hash added to a HyperLogLog, and the salt expires with the day.
 */

const DAY_MS = 86_400_000;
const PREFIX = "stats:";
/** Kept a little over a year, so a month can always be compared with the same month last year. */
export const STATS_RETENTION_SECONDS = 400 * 24 * 60 * 60;
/** The salt outlives its UTC day only long enough for requests that straddle midnight. */
const SALT_SECONDS = 2 * 24 * 60 * 60;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|monitor|uptime/i;

export type DownloadChannel = "stable" | "beta";
export type StatsCounter = "downloads" | "update-checks" | "checkouts";
/** UTC day (YYYY-MM-DD) → field → count. */
export type DailyCounts = Record<string, Record<string, number>>;
export type StatsRequest = { ip: string; userAgent: string };

export interface SiteStatsStore {
  readonly kind: "redis" | "memory";
  increment(counter: StatsCounter, day: string, field: string): Promise<void>;
  /** Counts `member` once per day and version; only an estimate of distinct members is kept. */
  addMac(day: string, version: string, member: string): Promise<void>;
  daySalt(day: string): Promise<string>;
  counts(counter: StatsCounter, days: readonly string[]): Promise<DailyCounts>;
  macs(days: readonly string[]): Promise<DailyCounts>;
}

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
  return match ? versionLabel(match[1]) : null;
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

/** Counts a checkout once the redirect to Polar has gone out. */
export function countCheckout(plan: string): void {
  const now = Date.now();
  const work = (): Promise<void> => recordCheckout(siteStatsStore(), plan, now);
  try {
    after(work);
  } catch {
    // Outside a request (the route's unit tests) there is no "after"; count straight away.
    void work();
  }
}

/** One update check from Sparkle: the raw check, and this Mac once for the day. */
export function recordUpdateCheck(
  store: SiteStatsStore | null, version: string, request: StatsRequest, now: number
): Promise<void> {
  if (!store) return Promise.resolve();
  const day = statsDay(now);
  return quietly("update check", async () => {
    const salt = await store.daySalt(day);
    await Promise.all([
      store.increment("update-checks", day, version),
      store.addMac(day, version, macMember(salt, request))
    ]);
  });
}

function toCounts(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!value || typeof value !== "object") return counts;
  for (const [field, raw] of Object.entries(value)) {
    const count = Number(raw);
    if (Number.isSafeInteger(count) && count > 0) counts[field] = count;
  }
  return counts;
}

class RedisStatsStore implements SiteStatsStore {
  readonly kind = "redis";
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async increment(counter: StatsCounter, day: string, field: string): Promise<void> {
    const key = `${PREFIX}${counter}:${day}`;
    await this.redis.pipeline().hincrby(key, field, 1).expire(key, STATS_RETENTION_SECONDS).exec();
  }

  async addMac(day: string, version: string, member: string): Promise<void> {
    const key = `${PREFIX}macs:${day}:${version}`;
    const versions = `${PREFIX}macs-versions:${day}`;
    await this.redis.pipeline()
      .pfadd(key, member).expire(key, STATS_RETENTION_SECONDS)
      .sadd(versions, version).expire(versions, STATS_RETENTION_SECONDS)
      .exec();
  }

  async daySalt(day: string): Promise<string> {
    const key = `${PREFIX}salt:${day}`;
    await this.redis.set(key, randomBytes(16).toString("hex"), { nx: true, ex: SALT_SECONDS });
    const salt = await this.redis.get<string>(key);
    if (typeof salt !== "string" || !salt) throw new Error("Missing day salt");
    return salt;
  }

  async counts(counter: StatsCounter, days: readonly string[]): Promise<DailyCounts> {
    if (days.length === 0) return {};
    const pipeline = this.redis.pipeline();
    for (const day of days) pipeline.hgetall(`${PREFIX}${counter}:${day}`);
    const results = await pipeline.exec<unknown[]>();
    return Object.fromEntries(days.map((day, index) => [day, toCounts(results[index])]));
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
}

/** The local dev server's store; exact sets stand in for HyperLogLogs. */
export class MemoryStatsStore implements SiteStatsStore {
  readonly kind = "memory";
  private readonly counters = new Map<string, Map<string, number>>();
  private readonly macSets = new Map<string, Map<string, Set<string>>>();
  private readonly salts = new Map<string, string>();

  async increment(counter: StatsCounter, day: string, field: string): Promise<void> {
    const key = `${counter}:${day}`;
    const fields = this.counters.get(key) ?? new Map<string, number>();
    fields.set(field, (fields.get(field) ?? 0) + 1);
    this.counters.set(key, fields);
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
  // Raw strings back: a salt that happens to look like a number must stay a string.
  return config ? new RedisStatsStore(new Redis({ ...config, automaticDeserialization: false })) : null;
}
