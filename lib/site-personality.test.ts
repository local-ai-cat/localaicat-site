import test from "node:test";
import assert from "node:assert/strict";
import { resolveSiteMode, MODES, SITE_CREW, siteWorld, modeForWorld, nextEarthMode } from "./site-personality.ts";

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
