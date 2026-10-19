"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { analyticsEnabled, analyticsPreferenceEvent } from "../../lib/site-analytics";
import { publicTelemetryUrl, sanitizeSpeedEvent } from "../../lib/site-telemetry-privacy";

/** Performance collection shares the site's opt-out and public-route boundary. */
export function SiteSpeedInsights() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    function sync(): void {
      setEnabled(publicTelemetryUrl(window.location.href, analyticsEnabled()) !== null);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(analyticsPreferenceEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(analyticsPreferenceEvent, sync);
    };
  }, [pathname]);
  if (!enabled || !publicTelemetryUrl(`https://localaicat.com${pathname}`, true)) return null;
  return <SpeedInsights beforeSend={(event) => sanitizeSpeedEvent(event, analyticsEnabled())} />;
}
