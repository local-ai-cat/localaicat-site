import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildModel,
  flavorOrder,
  flavorStates,
  moduleFlavorState,
  packageState,
  type FeatureInput,
  type GraphInput,
  type InfraModuleInput
} from "./build-anatomy.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
function readData(name: string): unknown {
  return JSON.parse(readFileSync(path.join(here, "..", "data", name), "utf8"));
}

// Every channel cell is "yes" so a channel key present == feature fully in that flavor.
function channels(present: Array<"main" | "outdoor" | "beta" | "alpha">, partial: string[] = []) {
  return (["main", "outdoor", "beta", "alpha"] as const).map((key) => ({
    key,
    iOS: partial.includes(key) ? "partial" : present.includes(key) ? "yes" : "no",
    macOS: partial.includes(key) ? "partial" : present.includes(key) ? "yes" : "no"
  }));
}

const features: FeatureInput[] = [
  {
    id: "chat",
    name: "Chat",
    ownedPackages: ["ChatKit"],
    usesPackages: ["ServingEngine"],
    channels: channels(["main", "outdoor", "beta", "alpha"]) as FeatureInput["channels"]
  },
  {
    id: "studio",
    name: "Studio",
    ownedPackages: ["StudioKit"],
    usesPackages: ["CaptureEngine"],
    channels: channels(["alpha"]) as FeatureInput["channels"]
  }
];

const infraModules: InfraModuleInput[] = [
  { id: "serving-engine", name: "Serving engine", kind: "engine", description: "", packages: ["ServingEngine"] },
  { id: "capture-engine", name: "Capture engine", kind: "engine", description: "", packages: ["CaptureEngine"] },
  { id: "core", name: "Core", kind: "platform", description: "", packages: ["Core"] },
  { id: "harness", name: "Harness", kind: "harness", description: "", packages: ["ScenarioHarness"] }
];

const graph: GraphInput = {
  packages: [
    { name: "ChatKit", deps: ["Core"], reverseDeps: [], appStoreGates: [], linkedInProject: true },
    { name: "StudioKit", deps: ["Core"], reverseDeps: [], appStoreGates: [], linkedInProject: true },
    { name: "ServingEngine", deps: ["Core"], reverseDeps: ["ChatKit"], appStoreGates: [], linkedInProject: true },
    { name: "CaptureEngine", deps: ["Core"], reverseDeps: ["StudioKit"], appStoreGates: [], linkedInProject: false },
    { name: "Core", deps: [], reverseDeps: ["ChatKit", "StudioKit", "ServingEngine", "CaptureEngine"], appStoreGates: [], linkedInProject: true },
    { name: "ScenarioHarness", deps: [], reverseDeps: [], appStoreGates: [], linkedInProject: false }
  ]
};

const model = buildModel(features, infraModules, graph);

test("feature-owned package tracks its owner's flavor inclusion", () => {
  assert.equal(packageState(model, "ChatKit", "indoor").state, "linked");
  const studioIndoor = packageState(model, "StudioKit", "indoor");
  assert.equal(studioIndoor.state, "stripped");
  assert.match(studioIndoor.reason ?? "", /owning feature Studio not in Indoor/);
  assert.equal(packageState(model, "StudioKit", "alpha").state, "linked");
});

test("infrastructure package is linked only when a consumer feature ships", () => {
  // CaptureEngine only feeds Studio (alpha-only) → stripped in Indoor, linked in Alpha.
  const indoor = packageState(model, "CaptureEngine", "indoor");
  assert.equal(indoor.state, "stripped");
  assert.match(indoor.reason ?? "", /no consumer of CaptureEngine ships in Indoor/);
  assert.equal(packageState(model, "CaptureEngine", "alpha").state, "linked");
  // Core is reached by Chat (all flavors) → always linked.
  assert.equal(packageState(model, "Core", "indoor").state, "linked");
});

test("partial owner cell yields a partial package", () => {
  const partialFeatures: FeatureInput[] = [
    {
      id: "chat",
      name: "Chat",
      ownedPackages: ["ChatKit"],
      usesPackages: [],
      channels: channels([], ["main"]) as FeatureInput["channels"]
    }
  ];
  const partialModel = buildModel(partialFeatures, [], {
    packages: [{ name: "ChatKit", deps: [], reverseDeps: [], appStoreGates: [], linkedInProject: true }]
  });
  assert.equal(packageState(partialModel, "ChatKit", "indoor").state, "partial");
});

test("harness packages are always stripped", () => {
  for (const flavor of flavorOrder) {
    assert.equal(packageState(model, "ScenarioHarness", flavor).state, "stripped");
    assert.equal(packageState(model, "ScenarioHarness", flavor).reason, "test-only, never linked");
  }
});

test("moduleFlavorState: feature row reads its channel grid, not its packages", () => {
  // Studio ships alpha-only regardless of package graph.
  const studioAlpha = moduleFlavorState(model, { kind: "feature", featureId: "studio", packages: ["StudioKit"] }, "alpha");
  assert.equal(studioAlpha.state, "linked");
  const studioIndoor = moduleFlavorState(model, { kind: "feature", featureId: "studio", packages: ["StudioKit"] }, "indoor");
  assert.equal(studioIndoor.state, "stripped");
  assert.equal(studioIndoor.reason, "Not shipped in Indoor");
  // A feature that owns no packages still ships from its channel grid.
  const ownsNothing = moduleFlavorState(model, { kind: "feature", featureId: "chat", packages: [] }, "indoor");
  assert.equal(ownsNothing.state, "linked");
});

test("moduleFlavorState: infra row aggregates its packages (linked > partial > stripped)", () => {
  const capture = moduleFlavorState(model, { kind: "engine", featureId: null, packages: ["CaptureEngine"] }, "indoor");
  assert.equal(capture.state, "stripped");
  assert.equal(capture.reason, "No consumer ships in Indoor");
  const captureAlpha = moduleFlavorState(model, { kind: "engine", featureId: null, packages: ["CaptureEngine"] }, "alpha");
  assert.equal(captureAlpha.state, "linked");
  // Harness rows are always test-only.
  const harness = moduleFlavorState(model, { kind: "harness", featureId: null, packages: ["ScenarioHarness"] }, "alpha");
  assert.equal(harness.state, "stripped");
  assert.equal(harness.reason, "Test-only, never linked");
});

test("real generated data: every package conserved across every flavor", () => {
  const publicFeatures = readData("public-features.json") as { features: FeatureInput[]; modules: InfraModuleInput[] };
  const realGraph = readData("module-graph.json") as GraphInput;
  const realModel = buildModel(publicFeatures.features, publicFeatures.modules, realGraph);
  const total = realGraph.packages.length;
  assert.ok(total > 0);
  assert.equal(realModel.order.length, total);
  for (const flavor of flavorOrder) {
    const states = flavorStates(realModel, flavor);
    assert.equal(states.linked + states.partial + states.stripped, total);
    assert.equal(states.total, total);
  }
});
