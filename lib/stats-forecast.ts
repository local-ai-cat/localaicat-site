/**
 * The chart's last bars are still filling in: today's day, this month, and whatever Apple hasn't published yet.
 * Drawn as they are, they fall to the floor. Instead each one is drawn "on pace": what has come in so far plus
 * the rest of the bucket at the recent rate, which lands on the real number once the bucket is over.
 */

const DAY_MS = 86_400_000;
/** The rate is taken over about the last 30 days: one month bar, or seven day bars (a whole week of weekdays). */
const PACE_WINDOW = { month: 1, day: 7 } as const;

export type Granularity = keyof typeof PACE_WINDOW;

function bucketSpan(key: string): { start: number; end: number } {
  if (key.length === 7) {
    const start = Date.parse(`${key}-01T00:00:00Z`);
    const next = new Date(start);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { start, end: next.getTime() };
  }
  const start = Date.parse(`${key}T00:00:00Z`);
  return { start, end: start + DAY_MS };
}

/** How much of each bucket is known by `knownThrough`: 1 for a finished one, 0 for one with nothing in yet. */
export function knownShares(buckets: readonly string[], knownThrough: number): number[] {
  return buckets.map(key => {
    const { start, end } = bucketSpan(key);
    return Math.min(1, Math.max(0, (knownThrough - start) / (end - start)));
  });
}

/** The end of a published day ("2026-10-30"): everything up to it is known. */
export function endOfDay(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) + DAY_MS;
}

/**
 * Each bucket's value with its unknown part filled in at the pace of the trailing window, counted back from the
 * bucket's own known part. Finished buckets keep their value. Counts within a bucket are taken as spread evenly.
 */
export function onPace(values: readonly number[], shares: readonly number[], granularity: Granularity): number[] {
  return values.map((value, index) => {
    const missing = 1 - shares[index];
    if (missing <= 0) return value;
    let need = PACE_WINDOW[granularity];
    let counted = 0;
    let covered = 0;
    for (let back = index; back >= 0 && need > 0; back -= 1) {
      if (shares[back] <= 0) continue;
      const take = Math.min(shares[back], need);
      counted += values[back] * (take / shares[back]);
      covered += take;
      need -= take;
    }
    return covered > 0 ? value + missing * (counted / covered) : value;
  });
}

/** The first bucket still filling in, or the bucket count when every one is finished. */
export function firstPending(shares: readonly number[]): number {
  const index = shares.findIndex(share => share < 1);
  return index === -1 ? shares.length : index;
}

/**
 * How far along the chart the counts are known, in bars: 3.5 is halfway from the fourth bar to the fifth. The line
 * into a bar stands for that bar filling in, so the known part ends that share of the way along it.
 */
export function knownUpTo(shares: readonly number[]): number {
  const pending = firstPending(shares);
  if (pending === shares.length) return shares.length - 1;
  return Math.max(0, pending - 1 + shares[pending]);
}
