import { track, type BeforeSendEvent } from "@vercel/analytics";

export const analyticsOptOutKey = "space-explorer-count-off";
export const analyticsPreferenceEvent = "site-analytics-preference";
export type SiteAction = "download_clicked" | "creator_opened" | "cat_code_copied";
export type DownloadChannel = "mac" | "app_store";
const publicPaths = new Set([
  "/", "/download", "/download/app-store", "/outdoor", "/pricing", "/pricing/direct",
  "/pricing/app-store", "/personal", "/business", "/team", "/teams", "/enterprise", "/faq",
  "/support", "/contact", "/help/ssh", "/docs", "/docs/packages", "/screenshots",
  "/window-management", "/privacy", "/privacy/fr", "/terms", "/terms/fr", "/licenses",
  "/space/studio", "/space/cockpit", "/space/voyage"
]);

export function analyticsAllowed(optedOut: boolean, doNotTrack: string | null, globalPrivacyControl: boolean): boolean {
  return !optedOut && doNotTrack !== "1" && !globalPrivacyControl;
}

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (location.hostname !== "localaicat.com" && location.hostname !== "www.localaicat.com" &&
      !location.hostname.endsWith(".vercel.app")) return false;
  let optedOut = true;
  try { optedOut = localStorage.getItem(analyticsOptOutKey) === "1"; } catch { return false; }
  return analyticsAllowed(optedOut, navigator.doNotTrack,
    Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl));
}

export function sanitizeAnalyticsEvent(event: BeforeSendEvent, enabled: boolean): BeforeSendEvent | null {
  if (!enabled) return null;
  try {
    const url = new URL(event.url);
    if (!publicPaths.has(url.pathname)) return null;
    // Never send cat codes, checkout data, search input or other query/hash content.
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch { return null; }
}

export function trackSiteAction(action: SiteAction, channel?: DownloadChannel): void {
  if (!analyticsEnabled()) return;
  // Only fixed action names and download channels cross this boundary.
  if (action !== "download_clicked" && action !== "creator_opened" && action !== "cat_code_copied") return;
  try {
    if (action === "download_clicked" && (channel === "mac" || channel === "app_store")) track(action, { channel });
    else if (action !== "download_clicked") track(action);
  } catch { /* Analytics must never interrupt the action the visitor requested. */ }
}
