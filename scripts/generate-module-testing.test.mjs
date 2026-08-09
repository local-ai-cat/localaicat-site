import assert from "node:assert/strict";
import test from "node:test";
import {
  derivedPackageTesting,
  extractPackageNames,
  loggingGrade,
  testingTier
} from "./generate-module-testing.mjs";

test("testingTier uses the documented count bands", () => {
  assert.equal(testingTier(0), "none");
  assert.equal(testingTier(1), "thin");
  assert.equal(testingTier(9), "thin");
  assert.equal(testingTier(10), "covered");
  assert.equal(testingTier(29), "covered");
  assert.equal(testingTier(30), "heavy");
});

test("derivedPackageTesting reads only the emitted derived axis", () => {
  const packages = derivedPackageTesting({
    packageTesting: [{
      evidence: {
        package: "FeatureExample",
        counts: { xctest: 4, swiftTesting: 7 },
        suitePaths: ["Packages/FeatureExample/Tests/FeatureExampleTests"],
        wiredness: "push-or-pull-request",
        wiringEvidencePaths: [".github/workflows/ci.yml"],
        ratchets: [{
          id: "swiftlint-warning-baseline",
          enforcement: "push-or-pull-request",
          evidencePaths: [".swiftlint-baseline.json"],
        }],
        realSurface: { status: "none-detected", commands: [], recordedEvidencePaths: [] },
      },
      lock: {
        package: "FeatureExample",
        suiteRequired: true,
        minimumTestCount: 10,
        wirednessRequired: true,
        requiredRatchets: ["swiftlint-warning-baseline"],
      },
      lockSatisfied: true,
    }],
  });

  assert.deepEqual(packages.get("FeatureExample").counts, {
    xctest: 4,
    swiftTesting: 7,
    total: 11,
  });
  assert.equal(packages.get("FeatureExample").lock.satisfied, true);
  assert.equal(packages.get("FeatureExample").wiredness, "push-or-pull-request");
});

test("derivedPackageTesting rejects authored manifests without the derived axis", () => {
  assert.throws(
    () => derivedPackageTesting({ features: [{ package: "FeatureExample", testing: "gold" }] }),
    /must contain the derived packageTesting array/,
  );
});

test("derivedPackageTesting rejects duplicate package evidence", () => {
  const row = {
    evidence: {
      package: "FeatureExample",
      counts: { xctest: 1, swiftTesting: 0 },
      suitePaths: [],
      wiredness: "orphan",
      wiringEvidencePaths: [],
      ratchets: [],
      realSurface: { status: "none-detected", commands: [], recordedEvidencePaths: [] },
    },
    lock: {
      package: "FeatureExample",
      suiteRequired: false,
      minimumTestCount: 0,
      wirednessRequired: false,
      requiredRatchets: [],
    },
    lockSatisfied: true,
  };
  assert.throws(() => derivedPackageTesting({ packageTesting: [row, row] }), /duplicates package/);
});

test("loggingGrade escalates on the strongest observability signal", () => {
  assert.equal(loggingGrade({ structured: 3, prints: 0, sentry: 2, hasPackages: true }), "L2");
  assert.equal(loggingGrade({ structured: 4, prints: 9, sentry: 0, hasPackages: true }), "L1");
  assert.equal(loggingGrade({ structured: 0, prints: 5, sentry: 0, hasPackages: true }), "L0");
  assert.equal(loggingGrade({ structured: 0, prints: 0, sentry: 0, hasPackages: false }), "L0-L1");
});

test("extractPackageNames uses exact package-name boundaries", () => {
  const known = ["FeatureTranslate", "FeatureTranslateDomain", "LocalSpeechKit"];
  assert.deepEqual(
    extractPackageNames(
      "FeatureTranslate + FeatureTranslateDomain + LocalSpeechKit + app wiring",
      known
    ),
    ["FeatureTranslate", "FeatureTranslateDomain", "LocalSpeechKit"]
  );
});
