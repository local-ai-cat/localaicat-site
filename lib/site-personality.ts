export const MODES = ["personal", "space", "business"] as const;
export type Mode = typeof MODES[number];
export const EARTH_MODES = ["personal", "business"] as const;
export type EarthMode = typeof EARTH_MODES[number];
export type World = "space" | "earth";

export const SITE_CREW = {
  personal: { name: "Purrdain" },
  space: { name: "Space Cadet" },
  business: { name: "Pawzos" },
} as const;

export const SITE_MODE_STORAGE_KEY = "space-preview-site-mode";
const earthThemeColour = "#090909";

export function resolveSiteMode(query: string | null, stored: string | null): Mode {
  if (MODES.some(mode => mode === query)) return query as Mode;
  if (MODES.some(mode => mode === stored)) return stored as Mode;
  return "space";
}

/**
 * Inline at the top of <body>, before anything paints. Pages are served in Space; a returning Earth visitor's world
 * is applied here, so they never see Space first while the app loads. `data-mode-pending` lets CSS show their world's
 * server-rendered hero until React, which starts in Space, renders it too (useSiteMode then clears the attribute).
 * Same rules as resolveSiteMode.
 */
export const initialModeScript = `(() => {
  try {
    const modes = ${JSON.stringify(MODES)};
    const query = new URLSearchParams(location.search).get("mode");
    let stored = null;
    try { stored = localStorage.getItem(${JSON.stringify(SITE_MODE_STORAGE_KEY)}); } catch {}
    let mode = "space";
    if (modes.includes(query)) mode = query;
    else if (modes.includes(stored)) mode = stored;
    if (mode === "space") return;
    document.documentElement.dataset.personality = mode;
    document.documentElement.dataset.modePending = mode;
    document.body.dataset.homeMode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ${JSON.stringify(earthThemeColour)});
  } catch {}
})();`;

export function siteWorld(mode: Mode): World {
  return mode === "space" ? "space" : "earth";
}

export function modeForWorld(world: World): Mode {
  return world === "space" ? "space" : "personal";
}

export function nextEarthMode(mode: EarthMode): EarthMode {
  return mode === "personal" ? "business" : "personal";
}
