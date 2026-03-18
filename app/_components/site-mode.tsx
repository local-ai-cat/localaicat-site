"use client";

import { useEffect } from "react";

const STORAGE_KEY = "site-mode";

type SiteModeProps = {
  /** Force a specific mode on deterministic pages (e.g. /team → business) */
  force?: "personal" | "business";
};

export function SiteMode({ force }: SiteModeProps) {
  useEffect(() => {
    const mode = force || localStorage.getItem(STORAGE_KEY) || "business";
    document.body.dataset.homeMode = mode;

    return () => {
      delete document.body.dataset.homeMode;
    };
  }, [force]);

  return null;
}

/** Call from client components (e.g. home page toggle) to persist the mode. */
export function persistSiteMode(mode: "personal" | "business") {
  localStorage.setItem(STORAGE_KEY, mode);
  document.body.dataset.homeMode = mode;
}
