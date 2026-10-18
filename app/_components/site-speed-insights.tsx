"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { withoutQuery } from "../../lib/bearer-urls";

/** Speed Insights with query strings removed, so checkout ids and activation tokens never reach the collector. */
export function SiteSpeedInsights() {
  return <SpeedInsights beforeSend={(event) => ({ ...event, url: withoutQuery(event.url) })} />;
}
