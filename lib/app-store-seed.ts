/**
 * Local AI Chat's App Store units for the months Apple's sales API no longer answers: it keeps monthly reports
 * for twelve months and had no yearly report for 2025. Exported once from App Store Connect → Trends → Units
 * (Content: Local AI Chat, by month, UTC) on 2026-10-29; lifetime 959 units at the time. Totals only: that
 * export doesn't split by device. These months are history and never change.
 */
export const APP_STORE_SEEDED_MONTHS: Readonly<Record<string, number>> = {
  "2025-02": 51,
  "2025-03": 21,
  "2025-04": 27,
  "2025-05": 22,
  "2025-06": 30,
  "2025-07": 24,
  "2025-08": 111,
  "2025-09": 31
};

export function seededAppStoreUnits(month: string): number | null {
  return APP_STORE_SEEDED_MONTHS[month] ?? null;
}
