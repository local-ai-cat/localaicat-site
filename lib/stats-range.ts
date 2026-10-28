/**
 * The windows /stats can show, and how each splits into bars: days for the short ones, calendar months
 * (UTC) for a year and for all time. Every bucket lists its days, so day-keyed counts can be summed into it.
 */

export type StatsRange = "7d" | "30d" | "90d" | "12m" | "all";
export type Bucket = { key: string; days: string[] };
export type RangeBuckets = { range: StatsRange; granularity: "day" | "month"; buckets: Bucket[]; days: string[] };

export const DEFAULT_RANGE: StatsRange = "30d";
export const STATS_RANGES: { range: StatsRange; label: string }[] = [
  { range: "7d", label: "7 days" },
  { range: "30d", label: "30 days" },
  { range: "90d", label: "90 days" },
  { range: "12m", label: "12 months" },
  { range: "all", label: "all time" }
];
/** The first month anything existed to count: Local AI Chat's first App Store versions, February 2025. */
export const HISTORY_START_MONTH = "2025-02";

const DAY_MS = 86_400_000;
const DAYS_IN_RANGE: Partial<Record<StatsRange, number>> = { "7d": 7, "30d": 30, "90d": 90 };
const MONTHS_IN_YEAR = 12;

export function parseRange(value: unknown): StatsRange {
  return STATS_RANGES.some(option => option.range === value) ? value as StatsRange : DEFAULT_RANGE;
}

export function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The `count` UTC days ending on `now`'s day, oldest first. */
export function lastDays(now: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => utcDay(now - (count - 1 - index) * DAY_MS));
}

/** "2025-02" plus `offset` months. */
export function addMonths(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

/** Months from `first` to `last`, both included, oldest first. */
export function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);
  return months;
}

/** The month's days, stopping at `today` for the current month. */
export function daysOfMonth(month: string, today: string): string[] {
  const days: string[] = [];
  for (let time = Date.parse(`${month}-01T00:00:00Z`); utcDay(time).startsWith(month); time += DAY_MS) {
    const day = utcDay(time);
    if (day > today) break;
    days.push(day);
  }
  return days;
}

export function rangeBuckets(range: StatsRange, now: number): RangeBuckets {
  const dayCount = DAYS_IN_RANGE[range];
  if (dayCount) {
    const days = lastDays(now, dayCount);
    return { range, granularity: "day", buckets: days.map(day => ({ key: day, days: [day] })), days };
  }
  const today = utcDay(now);
  const thisMonth = today.slice(0, 7);
  const first = range === "12m" ? addMonths(thisMonth, 1 - MONTHS_IN_YEAR) : HISTORY_START_MONTH;
  const buckets = monthsBetween(first, thisMonth).map(month => ({ key: month, days: daysOfMonth(month, today) }));
  return { range, granularity: "month", buckets, days: buckets.flatMap(bucket => bucket.days) };
}
