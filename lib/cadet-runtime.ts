export type PixelGrid = (string | null)[][];
export type AccessoryCategory = "headwear" | "eyewear" | "neckwear";
export type CatAppearance = {
  name: string; helmet: string; fur: string; eyes: string; accent: string; gear: string;
  headwear: string; eyewear: string; neckwear: string;
  expression: "awake" | "wink" | "sleepy"; badge: "pip" | "stripe" | "none"; motion: boolean;
};
export type CatDesign = {
  appearance: CatAppearance; birthday: string | null; mode: "cadet" | "drawing";
  drawing: PixelGrid | null; pixels?: PixelGrid;
};
export type CatRuntime = {
  model: {
    presets: Record<string, Partial<CatAppearance> & {name: string; fur: string}>;
    options: Record<AccessoryCategory, Record<string, string>>;
    defaults(): CatAppearance;
    normalizeDesign(input: unknown): CatDesign;
    serializeDesign(input: CatDesign): CatDesign & {pixels: PixelGrid};
    grid(input: CatAppearance): PixelGrid;
    validBirthday(input: string): boolean;
  };
  passport: {encode(input: CatDesign): string; decode(code: string): CatDesign & {pixels: PixelGrid}};
};
declare global {
  interface Window { CadetModel?: CatRuntime["model"]; CadetPassport?: CatRuntime["passport"] }
}
export const catStorageKey = "space-cadet-appearance-v1";
let runtimePromise: Promise<CatRuntime> | null = null;
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error("The wardrobe could not load. Please try again.")); };
    document.head.append(script);
  });
}
export function loadCatRuntime(): Promise<CatRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      if (!window.CadetModel) await loadScript("/space-demo/cadet-model.js");
      if (!window.CadetPassport) await loadScript("/space-demo/cadet-passport.js");
      if (!window.CadetModel || !window.CadetPassport) throw new Error("The wardrobe could not load.");
      return {model: window.CadetModel, passport: window.CadetPassport};
    })().catch(error => { runtimePromise = null; throw error; });
  }
  return runtimePromise;
}
export function readSavedCat(runtime: CatRuntime): CatDesign | null {
  try {
    const raw = localStorage.getItem(catStorageKey);
    if (!raw) return null;
    // Validate the same portable representation the app will receive.
    return runtime.passport.decode(runtime.passport.encode(runtime.model.normalizeDesign(JSON.parse(raw))));
  } catch { return null; }
}
export function previewCatCode(runtime: CatRuntime, design: CatDesign): {code: string; error: string} {
  if (!design.appearance.name.trim()) return {code:"", error:"Give your cat a name to make its code."};
  if (design.birthday && !runtime.model.validBirthday(design.birthday)) return {code:"", error:"Choose a real birthday, or leave it empty."};
  try { return {code:runtime.passport.encode(design), error:""}; }
  catch (failure) { return {code:"", error:failure instanceof Error ? failure.message : "Check your cat’s details to make its code."}; }
}
export function describeCat(runtime: CatRuntime, design: CatDesign): string {
  if (design.mode === "drawing") return "Hand-drawn stardust. One of a kind.";
  const {appearance} = design;
  const preset = Object.entries(runtime.model.presets).find(([, value]) => value.fur.toLowerCase() === appearance.fur.toLowerCase());
  const colours: Record<string, string> = {classic:"lilac", moon:"blue", peach:"peach", citrus:"golden", mint:"mint", dusk:"violet", ember:"ginger", ghost:"silvery"};
  const colour = preset ? colours[preset[0]] ?? "colourful" : "custom-coloured";
  const expressions = {awake:"Bright-eyed", wink:"Winking", sleepy:"Sleepy"};
  const accessories = (Object.keys(runtime.model.options) as AccessoryCategory[])
    .filter(category => appearance[category] !== "none")
    .map(category => runtime.model.options[category][appearance[category]])
    .filter(Boolean);
  const outfit = accessories.length ? accessories.join(" · ") : "Ready for a tiny adventure.";
  return `${expressions[appearance.expression]} ${colour} explorer. ${outfit}`;
}
export function saveCat(runtime: CatRuntime, input: CatDesign): {design: CatDesign; code: string; persisted: boolean} {
  const code = runtime.passport.encode(input);
  const design = runtime.passport.decode(code);
  let persisted = true;
  try { localStorage.setItem(catStorageKey, JSON.stringify(design)); }
  catch { persisted = false; }
  return {design, code, persisted};
}
