/**
 * Local AI Chat's App Store first downloads for the months Apple's sales API no longer answers: it keeps monthly
 * reports for twelve months and had no yearly report for 2025. Exported once from App Store Connect → Trends →
 * Units → Device (Content: Local AI Chat, by month, UTC) on 2026-10-29; lifetime 959 units at the time. `ios` is
 * iPhone plus iPad, `mac` is Desktop. These months are history and never change.
 */
export const APP_STORE_SEEDED_MONTHS: Readonly<Record<string, { ios: number; mac: number }>> = {
  "2025-02": { ios: 51, mac: 0 },
  "2025-03": { ios: 21, mac: 0 },
  "2025-04": { ios: 26, mac: 1 },
  "2025-05": { ios: 21, mac: 1 },
  "2025-06": { ios: 27, mac: 3 },
  "2025-07": { ios: 18, mac: 6 },
  "2025-08": { ios: 109, mac: 2 },
  "2025-09": { ios: 30, mac: 1 }
};

export function seededAppStoreUnits(month: string): { ios: number; mac: number } | null {
  return APP_STORE_SEEDED_MONTHS[month] ?? null;
}
