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

export function resolveSiteMode(query: string | null, stored: string | null): Mode {
  if (MODES.some(mode => mode === query)) return query as Mode;
  if (MODES.some(mode => mode === stored)) return stored as Mode;
  return "space";
}

export function siteWorld(mode: Mode): World {
  return mode === "space" ? "space" : "earth";
}

export function modeForWorld(world: World): Mode {
  return world === "space" ? "space" : "personal";
}

export function nextEarthMode(mode: EarthMode): EarthMode {
  return mode === "personal" ? "business" : "personal";
}
