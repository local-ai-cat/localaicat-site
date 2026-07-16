import assert from "node:assert/strict";
import test from "node:test";
import {
  appTestOwnsFeature,
  countTestDeclarations,
  extractPackageNames,
  featureAliases,
  hasUIPlacements,
  isBehavioralTest,
  isPureEngineFeature
} from "./generate-module-behavioral.mjs";

test("countTestDeclarations counts Swift Testing and XCTest cases", () => {
  assert.equal(countTestDeclarations(`
    @Test("works")
    func works() {}
    func testLegacyPath() {}
    // func testCommentedOut() {}
  `), 2);
});

test("extractPackageNames uses package-name boundaries", () => {
  assert.deepEqual(
    extractPackageNames("FeatureChat + LocalAICore + app adapters", ["FeatureChat", "Chat", "LocalAICore"]),
    ["FeatureChat", "LocalAICore"]
  );
});

test("feature aliases and package imports associate app tests conservatively", () => {
  const feature = { id: "global-transcription", name: "Global Transcription (menu bar)" };
  assert.deepEqual(featureAliases(feature, ["FeatureGlobalTranscription"]), ["globaltranscription"]);
  assert.equal(appTestOwnsFeature("MenuBarFeatureCoverageUITests.swift", "import XCTest", feature, ["FeatureGlobalTranscription"]), false);
  assert.equal(appTestOwnsFeature("GlobalTranscriptionFlowUITests.swift", "import XCTest", feature, ["FeatureGlobalTranscription"]), true);
  assert.equal(appTestOwnsFeature("RuntimeTests.swift", "import FeatureGlobalTranscription", feature, ["FeatureGlobalTranscription"]), true);
});

test("behavioral detection requires an XCUITest or explicit drive harness", () => {
  assert.equal(isBehavioralTest("FeatureUITests.swift", "import XCTest\nlet app = XCUIApplication()"), true);
  assert.equal(isBehavioralTest("FeatureE2ETests.swift", "import Testing\n@Test func runs() {}"), true);
  assert.equal(isBehavioralTest("FeatureTests.swift", "import Testing\n@Test func runs() {}"), false);
});

test("pure engine heuristic excludes UI features and all-Kit/Core package ownership", () => {
  const engine = { group: null, uiPlacements: {} };
  const interactive = { group: null, uiPlacements: { homeTile: { routeID: "chat" } } };
  assert.equal(hasUIPlacements(engine), false);
  assert.equal(isPureEngineFeature(engine, ["SnapCaptureKit", "SnapDeviceCaptureKit"]), true);
  assert.equal(isPureEngineFeature(interactive, ["LocalAICore"]), false);
  assert.equal(isPureEngineFeature({ group: "infra", uiPlacements: {} }, ["FeatureBridge"]), true);
});
