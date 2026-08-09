import assert from "node:assert/strict";
import test from "node:test";
import { packageRows } from "./generate-packages.mjs";

const graph = {
  updated: "2026-08-10",
  packages: [{
    name: "FeatureExample",
    deps: ["SupportKit"],
    reverseDeps: [],
    appStoreGates: [],
    linkedInProject: true,
  }],
};

const publicFeatures = {
  features: [{
    id: "example",
    name: "Example",
    ownedPackages: ["FeatureExample"],
    modular: "yes",
  }],
  modules: [],
};

const testing = new Map([["FeatureExample", {
  counts: { xctest: 3, swiftTesting: 8, total: 11 },
  suitePaths: ["Packages/FeatureExample/Tests/FeatureExampleTests"],
  wiredness: "push-or-pull-request",
  wiringEvidencePaths: [".github/workflows/ci.yml"],
  ratchets: [],
  realSurface: { status: "none-detected", commands: [], recordedEvidencePaths: [] },
  lock: {
    satisfied: true,
    suiteRequired: true,
    minimumTestCount: 10,
    wirednessRequired: true,
    requiredRatchets: [],
  },
}]]);

test("packageRows projects the derived testing evidence and lock", () => {
  const [row] = packageRows(graph, publicFeatures, testing);

  assert.deepEqual(row.testing.counts, { xctest: 3, swiftTesting: 8, total: 11 });
  assert.equal(row.testing.tier, "covered");
  assert.equal(row.testing.lock.satisfied, true);
  assert.equal(row.testing.lock.minimumTestCount, 10);
});

test("packageRows refuses a graph package without derived evidence", () => {
  assert.throws(
    () => packageRows(graph, publicFeatures, new Map()),
    /missing derived packageTesting data/,
  );
});
