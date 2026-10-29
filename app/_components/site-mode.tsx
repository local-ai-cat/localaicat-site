"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { EARTH_MODES, SITE_MODE_STORAGE_KEY, modeForWorld, nextEarthMode, resolveSiteMode, siteWorld, type Mode, type World } from "../../lib/site-personality";

const EVENT_NAME = "cat-site-mode";

// Holds the choice for this visit when the browser refuses storage, since the address no longer carries it.
let rememberedMode: Mode | null = null;

function readSaved(key: string): string | null {
  try { return localStorage.getItem(key) ?? rememberedMode; } catch { return rememberedMode; }
}

export function getInitialMode(): Mode {
  if (typeof window === "undefined") return "space";
  return resolveSiteMode(new URLSearchParams(window.location.search).get("mode"), readSaved(SITE_MODE_STORAGE_KEY));
}

export function persistSiteMode(mode: Mode): void {
  rememberedMode = mode;
  try {
    localStorage.setItem(SITE_MODE_STORAGE_KEY, mode);
  } catch { /* rememberedMode carries the choice for this visit. */ }
  document.body.dataset.homeMode = mode;
  document.documentElement.dataset.personality = mode;
  // A ?mode= link picks the world once; the saved choice carries it from then on, so the address stays clean.
  const url = new URL(window.location.href);
  if (url.searchParams.has("mode")) {
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  }
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", mode === "space" ? "#17131f" : "#090909");
  window.dispatchEvent(new CustomEvent<Mode>(EVENT_NAME, { detail: mode }));
}

export function useSiteMode(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>("space");
  useEffect(() => {
    setMode(getInitialMode());
    const update = (): void => setMode(getInitialMode());
    window.addEventListener(EVENT_NAME, update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener(EVENT_NAME, update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  useEffect(() => {
    // React now renders the world initialModeScript showed before hydration; the page's own state takes over.
    if (document.documentElement.dataset.modePending === mode) delete document.documentElement.dataset.modePending;
  }, [mode]);
  return [mode, persistSiteMode];
}

export function SiteMode({ force }: { force?: "personal" | "business" }) {
  const pathname = usePathname();
  useEffect(() => {
    // The selected appearance also persists across the team's pricing routes.
    void force;
    persistSiteMode(getInitialMode());
    const syncHistory = (): void => persistSiteMode(getInitialMode());
    window.addEventListener("popstate", syncHistory);
    return () => window.removeEventListener("popstate", syncHistory);
  }, [pathname, force]);
  return null;
}

function isNavigationKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  return ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key);
}

/**
 * The Space/Earth switch. Personal and Business follow it on Earth (`earthChoices`), except on the homepage, whose
 * hero carries its own; the desktop header leaves them out so its switch never moves when the world changes.
 */
export function ModeSelector({ compact = false, earthChoices = true }: { compact?: boolean; earthChoices?: boolean }) {
  const [mode, selectMode] = useSiteMode();
  const world = siteWorld(mode);
  const showEarthChoices = usePathname() !== "/" && earthChoices;
  function selectWorld(nextWorld: World): void {
    if (nextWorld !== world) selectMode(modeForWorld(nextWorld));
  }
  return (
    <div className={`siteWorldControls${compact ? " siteWorldControlsCompact" : ""}`}>
      <div role="group" aria-label="Website world" className={`personalitySwitch${compact ? " personalitySwitchCompact" : ""}`}>
        {(["space", "earth"] as const).map(item => (
          <button type="button" key={item} aria-pressed={world === item} onClick={() => selectWorld(item)}
            onKeyDown={event => {
              if (!isNavigationKey(event)) return;
              event.preventDefault();
              let next: World = item === "space" ? "earth" : "space";
              if (event.key === "Home") next = "space";
              if (event.key === "End") next = "earth";
              selectWorld(next);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next === "space" ? 0 : 1]?.focus();
            }}>
            <span aria-hidden="true" className={item === "space" ? "spacePyramidIcon" : undefined}>{item === "earth" ? "◒" : null}</span> {item === "space" ? "Space" : "Earth"}
          </button>
        ))}
      </div>
      {showEarthChoices && <EarthPersonalitySelector />}
    </div>
  );
}

export function EarthPersonalitySelector({ persistent = false }: { persistent?: boolean }) {
  const [mode, selectMode] = useSiteMode();
  if (!persistent && siteWorld(mode) !== "earth") return null;
  return (
    <div role="group" aria-label="Earth personality" className="earthPersonality">
      {EARTH_MODES.map(item => (
        <button type="button" key={item} aria-pressed={mode === item} onClick={() => selectMode(item)}
          onKeyDown={event => {
            if (!isNavigationKey(event)) return;
            event.preventDefault();
            let next = nextEarthMode(item);
            if (event.key === "Home") next = "personal";
            if (event.key === "End") next = "business";
            selectMode(next);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[EARTH_MODES.indexOf(next)]?.focus();
          }}>
          {item === "personal" ? "Personal" : "Business"}
        </button>
      ))}
    </div>
  );
}
