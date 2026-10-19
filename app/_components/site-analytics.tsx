"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { publicTelemetryUrl } from "../../lib/site-telemetry-privacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { analyticsEnabled, analyticsOptOutKey, analyticsPreferenceEvent, sanitizeAnalyticsEvent } from "../../lib/site-analytics";

export function SiteAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const lastPage = useRef<string | null>(null);
  useEffect(() => {
    function sync(): void {
      const allowed = publicTelemetryUrl(window.location.href, analyticsEnabled()) !== null;
      if (!allowed) lastPage.current = null;
      setEnabled(allowed);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(analyticsPreferenceEvent, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(analyticsPreferenceEvent, sync); };
  }, [pathname]);
  const beforeSend = useCallback((event: BeforeSendEvent): BeforeSendEvent | null => {
    const clean = sanitizeAnalyticsEvent(event, analyticsEnabled());
    if (!clean) return null;
    if (clean.type === "pageview") {
      // Switching Space/Earth only changes the query string, not the page visit.
      if (clean.url === lastPage.current) return null;
      lastPage.current = clean.url;
    }
    return clean;
  }, []);
  if (!enabled || !publicTelemetryUrl(`https://localaicat.com${pathname}`, true)) return null;
  return <Analytics beforeSend={beforeSend} debug={false} />;
}

export function AnalyticsPreference({ french = false }: { french?: boolean }) {
  const [optedOut, setOptedOut] = useState(false);
  const [browserPrivacy, setBrowserPrivacy] = useState(false);
  useEffect(() => {
    setBrowserPrivacy(navigator.doNotTrack === "1" || Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl));
    try { setOptedOut(localStorage.getItem(analyticsOptOutKey) === "1"); } catch { setOptedOut(true); }
  }, []);
  function change(enabled: boolean): void {
    try { localStorage.setItem(analyticsOptOutKey, enabled ? "0" : "1"); } catch { return; }
    setOptedOut(!enabled);
    window.dispatchEvent(new Event(analyticsPreferenceEvent));
  }
  return <label className="analyticsPreference"><input type="checkbox" checked={!optedOut && !browserPrivacy} disabled={browserPrivacy} onChange={event => change(event.currentTarget.checked)} />
    {french ? "Autoriser les statistiques du site dans ce navigateur" : "Allow website statistics in this browser"}
    {browserPrivacy && <small>{french ? "Votre navigateur a déjà demandé à ne pas être compté." : "Your browser has already asked not to be counted."}</small>}
  </label>;
}
