export const explorerPollMs = 60_000;
export type ExplorerSnapshot = {
  available: boolean;
  active: null;
  visitsToday: number | null;
  day: string;
  serverTime: number;
  updatedAt: number | null;
  visitsWindow: "utc-day";
  source: "goatcounter";
};

export function parseExplorerSnapshot(value: unknown): ExplorerSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.available !== "boolean" || data.active !== null ||
      data.visitsWindow !== "utc-day" || data.source !== "goatcounter" ||
      typeof data.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.day) ||
      typeof data.serverTime !== "number" || !Number.isFinite(data.serverTime) ||
      data.serverTime < 0 || data.serverTime > 8.64e15) return null;
  if (new Date(data.serverTime).toISOString().slice(0, 10) !== data.day) return null;
  if (data.available) {
    if (!Number.isSafeInteger(data.visitsToday) || Number(data.visitsToday) < 0 ||
        typeof data.updatedAt !== "number" || !Number.isFinite(data.updatedAt) || data.updatedAt > data.serverTime ||
        data.updatedAt < Date.parse(`${data.day}T00:00:00Z`)) return null;
  } else if (data.visitsToday !== null || data.updatedAt !== null) return null;
  return data as ExplorerSnapshot;
}
