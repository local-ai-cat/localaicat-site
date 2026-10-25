"use client";

import { useEffect } from "react";
import type { PurrdainSource } from "../../lib/purrdain";
import { analyticsEnabled } from "../../lib/site-analytics";
import { goatCounterEventUrl } from "../../lib/site-telemetry-privacy";

/**
 * Counts where this visit came from as a GoatCounter event
 * (`purrdain-src-card`, `purrdain-src-lockscreen`, `purrdain-src-other`),
 * through the same GoatCounter pixel as page views (no remote script) and
 * under the same opt-out. The source travels as the event name, and only as a known tag.
 */
export function PurrdainSourceCount({ source }: { source: PurrdainSource }): null {
  useEffect(() => {
    const pixelUrl = goatCounterEventUrl(
      `purrdain-src-${source}`,
      window.location.hostname,
      analyticsEnabled(),
      Date.now()
    );
    if (!pixelUrl) return;
    const pixel = new Image(1, 1);
    pixel.referrerPolicy = "no-referrer";
    pixel.src = pixelUrl;
  }, [source]);

  return null;
}
