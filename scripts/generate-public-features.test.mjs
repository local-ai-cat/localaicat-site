import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { projectFeature, projectModule, validateModules } from "./generate-public-features.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
function readData(name) {
  return JSON.parse(readFileSync(path.join(here, "..", "data", name), "utf8"));
}

function makeFeature(overrides = {}) {
  return {
    id: "chat",
    name: "Chat",
    internal: false,
    lane: "stable",
    status: "live",
    modular: "yes",
    requirements: { minTier: "free" },
    permissions: ["none"],
    platforms: { iOS: "yes", macOS: "yes" },
    builds: {
      alpha: { iOS: "yes", macOS: "yes" },
      beta: { iOS: "yes", macOS: "yes" },
      main: { iOS: "yes", macOS: "yes" },
      outdoor: { iOS: "yes", macOS: "yes" }
    },
    ...overrides
  };
}

test("projectFeature projects and sorts ownedPackages / usesPackages", () => {
  const projected = projectFeature(
    makeFeature({ ownedPackages: ["ChatKit", "AchatDomain"], usesPackages: ["ServingEngine", "Core"] }),
    []
  );
  assert.deepEqual(projected.ownedPackages, ["AchatDomain", "ChatKit"]);
  assert.deepEqual(projected.usesPackages, ["Core", "ServingEngine"]);
});

test("projectFeature defaults package arrays to empty when absent", () => {
  const projected = projectFeature(makeFeature(), []);
  assert.deepEqual(projected.ownedPackages, []);
  assert.deepEqual(projected.usesPackages, []);
});

test("projectModule keeps public keys and DROPS internal notes", () => {
  const projected = projectModule({
    id: "serving-engine",
    name: "Serving engine",
    kind: "engine",
    description: "Shared local model serving.",
    packages: ["LocalAIServing", "AServingHelper"],
    notes: "internal: candidate for deletion once migration lands"
  });
  assert.deepEqual(Object.keys(projected).sort(), ["description", "id", "kind", "name", "packages"]);
  assert.equal("notes" in projected, false);
  // packages are sorted deterministically.
  assert.deepEqual(projected.packages, ["AServingHelper", "LocalAIServing"]);
});

test("validateModules accepts a well-formed module list with optional notes", () => {
  assert.doesNotThrow(() =>
    validateModules([
      { id: "core", name: "Core", kind: "platform", description: "Foundation.", packages: ["LocalAICore"] },
      { id: "harness", name: "Harness", kind: "harness", description: "Test scaffolding.", packages: ["ScenarioHarness"], notes: "n/a" }
    ])
  );
});

test("validateModules rejects an unknown kind and unknown keys", () => {
  assert.throws(
    () => validateModules([{ id: "x", name: "X", kind: "widget", description: "d", packages: ["P"] }]),
    /unknown value/
  );
  assert.throws(
    () => validateModules([{ id: "x", name: "X", kind: "engine", description: "d", packages: ["P"], bogus: 1 }]),
    /unknown key/
  );
});

test("committed public-features.json carries the projected package + module shape", () => {
  const data = readData("public-features.json");
  assert.ok(Array.isArray(data.features) && data.features.length > 0);
  assert.ok(Array.isArray(data.modules) && data.modules.length > 0);
  for (const feature of data.features) {
    assert.ok(Array.isArray(feature.ownedPackages), `${feature.id} ownedPackages`);
    assert.ok(Array.isArray(feature.usesPackages), `${feature.id} usesPackages`);
  }
  for (const module of data.modules) {
    assert.deepEqual(Object.keys(module).sort(), ["description", "id", "kind", "name", "packages"]);
  }
});
