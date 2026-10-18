const MIN_SEATS = 2;
const MAX_SEATS = 100;

/** Whole seats only: a fractional count would fail the seat product and fall through to the Pro Annual fallback. */
export function seatCount(value: unknown) {
  const requested = Math.trunc(Number(value));
  if (!Number.isFinite(requested)) return MIN_SEATS;
  return Math.max(MIN_SEATS, Math.min(MAX_SEATS, requested));
}
