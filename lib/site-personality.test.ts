import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { resolveSiteMode, MODES, SITE_CREW, SITE_MODE_STORAGE_KEY, initialModeScript, siteWorld, modeForWorld, nextEarthMode } from "./site-personality.ts";

test("new visitors begin in Space; saved Personal and Business choices remain valid", () => {
  assert.equal(resolveSiteMode(null, null), "space");
  for (const mode of MODES) assert.equal(resolveSiteMode(null, mode), mode);
});
test("existing shareable modes take priority over a saved choice", () => {
  assert.equal(resolveSiteMode("personal", "space"), "personal");
  assert.equal(resolveSiteMode("business", "personal"), "business");
  assert.equal(resolveSiteMode("space", "business"), "space");
});
test("invalid modes cannot become a class or hide the page", () => {
  assert.equal(resolveSiteMode("other", "business"), "business");
  assert.equal(resolveSiteMode(null, "invalid"), "space");
  assert.equal(resolveSiteMode("<script>", ""), "space");
});
test("Earth groups the original Personal and Business appearances", () => {
  assert.equal(siteWorld("personal"), "earth");
  assert.equal(siteWorld("business"), "earth");
  assert.equal(siteWorld("space"), "space");
});
test("entering Earth starts on Personal even after a Business visit", () => {
  assert.equal(modeForWorld("earth"), "personal");
  assert.equal(nextEarthMode("personal"), "business");
  assert.equal(modeForWorld("space"), "space");
  assert.equal(modeForWorld("earth"), "personal");
});
test("Earth keyboard navigation loops only between Personal and Business", () => {
  assert.equal(nextEarthMode("personal"), "business");
  assert.equal(nextEarthMode("business"), "personal");
});
test("the website preserves the same three cats", () => {
  assert.deepEqual(Object.keys(SITE_CREW).sort(), [...MODES].sort());
  assert.equal(SITE_CREW.space.name, "Space Cadet");
  assert.equal(SITE_CREW.personal.name, "Purrdain");
  assert.equal(SITE_CREW.business.name, "Pawzos");
});

type PaintedWorld = { personality?: string; pending?: string; homeMode?: string; themeColour?: string };
const untouched: PaintedWorld = { personality: undefined, pending: undefined, homeMode: undefined, themeColour: undefined };

function paintBeforeHydration(search: string, stored: string | null, storageThrows = false): PaintedWorld {
  const html: Record<string, string> = {}, body: Record<string, string> = {};
  let themeColour: string | undefined;
  runInNewContext(initialModeScript, {
    URLSearchParams,
    location: { search },
    localStorage: { getItem(key: string) { if (storageThrows) throw new Error("denied"); return key === SITE_MODE_STORAGE_KEY ? stored : null; } },
    document: {
      documentElement: { dataset: html },
      body: { dataset: body },
      querySelector: () => ({ setAttribute: (_: string, value: string) => { themeColour = value; } })
    }
  });
  return { personality: html.personality, pending: html.modePending, homeMode: body.homeMode, themeColour };
}

test("the pre-paint script applies a saved Earth world and leaves Space pages as served", () => {
  for (const mode of ["personal", "business"]) {
    assert.deepEqual(paintBeforeHydration("", mode), { personality: mode, pending: mode, homeMode: mode, themeColour: "#090909" });
  }
  assert.deepEqual(paintBeforeHydration("", "space"), untouched);
  assert.deepEqual(paintBeforeHydration("", null), untouched);
  assert.deepEqual(paintBeforeHydration("", "moon"), untouched);
});

test("the pre-paint script follows resolveSiteMode: a ?mode= link wins, blocked storage falls back to Space", () => {
  assert.equal(paintBeforeHydration("?mode=business", "personal").pending, "business");
  assert.deepEqual(paintBeforeHydration("?mode=space", "personal"), untouched);
  assert.equal(paintBeforeHydration("?mode=moon", "personal").pending, "personal");
  assert.equal(paintBeforeHydration("?mode=business", null, true).pending, "business");
  assert.deepEqual(paintBeforeHydration("", null, true), untouched);
  for (const query of [null, ...MODES]) for (const stored of [null, ...MODES]) {
    const expected = resolveSiteMode(query, stored);
    const painted = paintBeforeHydration(query ? `?mode=${query}` : "", stored);
    assert.equal(painted.pending ?? "space", expected, `${query} / ${stored}`);
  }
});
