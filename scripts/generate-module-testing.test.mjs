import assert from "node:assert/strict";
import test from "node:test";
import {
  countTestDeclarations,
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

test("countTestDeclarations counts Swift Testing and XCTest declarations once", () => {
  const source = `
    @Test func inlineTest() {}

    @Test("A named test")
    func testSwiftStyleName() {}

    func testXCTestStyle() {}
    // func testCommentedOut() {}
    /* @Test func blockCommentedOut() {} */
  `;

  assert.equal(countTestDeclarations(source), 3);
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
