import { sanitizeAnalyticsEvent } from "./site-analytics.ts";

/** Apply the same public-route allowlist to performance and page-view collectors. */
export function publicTelemetryUrl(url: string, enabled: boolean): string | null {
  return sanitizeAnalyticsEvent({ type: "pageview", url }, enabled)?.url ?? null;
}

export function sanitizeSpeedEvent<T extends { url: string; route?: string }>(
  event: T,
  enabled: boolean
): T | null {
  const url = publicTelemetryUrl(event.url, enabled);
  if (!url) return null;
  // Do not retain a separately supplied route that could contain private path data.
  return { ...event, url, route: new URL(url).pathname };
}

/** GoatCounter's documented pixel API counts pages without executing remote code. */
export function goatCounterPixelUrl(url: string, enabled: boolean, cacheBust: number): string | null {
  const clean = publicTelemetryUrl(url, enabled);
  if (!clean) return null;
  const page = new URL(clean);
  if (page.hostname !== "localaicat.com" && page.hostname !== "www.localaicat.com") return null;
  const pixel = new URL("https://localaicat.goatcounter.com/count");
  pixel.searchParams.set("p", page.pathname);
  pixel.searchParams.set("rnd", String(cacheBust));
  return pixel.toString();
}

/**
 * A named GoatCounter event: the event name is the only thing sent, never the
 * page URL, its query or a referrer. Production hosts only.
 */
export function goatCounterEventUrl(
  event: string,
  hostname: string,
  enabled: boolean,
  cacheBust: number
): string | null {
  if (!enabled) return null;
  if (hostname !== "localaicat.com" && hostname !== "www.localaicat.com") return null;
  const pixel = new URL("https://localaicat.goatcounter.com/count");
  pixel.searchParams.set("p", event);
  pixel.searchParams.set("e", "true");
  pixel.searchParams.set("rnd", String(cacheBust));
  return pixel.toString();
}
