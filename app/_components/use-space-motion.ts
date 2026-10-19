"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "space-preview-sky-motion";
const EVENT_NAME = "space-preview-motion";

export function useSpaceMotion() {
  const [enabled, setEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    try { setEnabled(localStorage.getItem(STORAGE_KEY) !== "off"); }
    catch { setEnabled(true); }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = (): void => setReducedMotion(media.matches);
    const syncMotion = (event: Event): void => setEnabled((event as CustomEvent<boolean>).detail);
    syncPreference();
    media.addEventListener("change", syncPreference);
    window.addEventListener(EVENT_NAME, syncMotion);
    return () => {
      media.removeEventListener("change", syncPreference);
      window.removeEventListener(EVENT_NAME, syncMotion);
    };
  }, []);

  function toggleMotion(): void {
    const next = !enabled;
    try { localStorage.setItem(STORAGE_KEY, next ? "on" : "off"); }
    catch { /* The visible choice still applies without storage. */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }

  return { enabled, reducedMotion, toggleMotion };
}
