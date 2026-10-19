"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsEnabled, analyticsPreferenceEvent } from "../lib/site-analytics";
import { goatCounterPixelUrl } from "../lib/site-telemetry-privacy";

/**
 * A first-party pixel request counts public page views without loading count.js
 * into the purchase document. No URL query, referrer, title or screen data is sent.
 */
export function GoatCounter(): null {
  const pathname = usePathname();
  const lastCountedPath = useRef<string | null>(null);

  useEffect(() => {
    function countPageview(): void {
      const enabled = analyticsEnabled();
      const pixelUrl = goatCounterPixelUrl(window.location.href, enabled, Date.now());
      if (!pixelUrl) {
        lastCountedPath.current = null;
        return;
      }
      const path = window.location.pathname;
      if (lastCountedPath.current === path) return;
      lastCountedPath.current = path;
      const pixel = new Image(1, 1);
      pixel.referrerPolicy = "no-referrer";
      pixel.src = pixelUrl;
    }
    countPageview();
    window.addEventListener("storage", countPageview);
    window.addEventListener(analyticsPreferenceEvent, countPageview);
    return () => {
      window.removeEventListener("storage", countPageview);
      window.removeEventListener(analyticsPreferenceEvent, countPageview);
    };
  }, [pathname]);

  return null;
}
