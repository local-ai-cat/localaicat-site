import assert from "node:assert/strict";
import test from "node:test";
import {
  computeReverseDeps,
  gateLinesInSource,
  isLinkedInProject,
  parsePackageDeps
} from "./generate-module-graph.mjs";

test("parsePackageDeps keeps sibling path deps, drops self and externals", () => {
  const source = `
    dependencies: [
      .package(path: "../AudioSession"),
      .package(path: "../SpeechPipeline"),
      .package(path: "../../external/catbs/WorkbenchWebUI"),
      .package(url: "https://example.com/Remote.git", from: "1.0.0")
    ],
  `;
  const known = ["AudioSession", "SpeechPipeline", "FeatureTranslate"];
  assert.deepEqual(
    parsePackageDeps(source, known, "FeatureTranslate"),
    ["AudioSession", "SpeechPipeline"]
  );
});

test("parsePackageDeps excludes a self-referential path and dedupes", () => {
  const source = `
    .package(path: "../FeatureTranslate"),
    .package(path: "../AudioSession"),
    .package(path: "../AudioSession")
  `;
  assert.deepEqual(
    parsePackageDeps(source, new Set(["FeatureTranslate", "AudioSession"]), "FeatureTranslate"),
    ["AudioSession"]
  );
});

test("gateLinesInSource matches only anchored preprocessor directives", () => {
  const source = [
    "import Foundation",
    "#if APPSTORE_BUILD",
    "  let sandboxed = true",
    "#endif",
    "// The `#if !APPSTORE_BUILD` guard documents Outdoor-only intent",
    "        #if !APPSTORE_BUILD",
    "let note = \"#if APPSTORE_BUILD in a string\""
  ].join("\n");
  assert.deepEqual(gateLinesInSource(source), [2, 6]);
});

test("isLinkedInProject uses exact package-path boundaries", () => {
  const yaml = [
    "  Feature:",
    "    path: ../Packages/FeatureTranslate",
    "  Domain:",
    "    path: ../Packages/FeatureTranslateDomain"
  ].join("\n");
  assert.equal(isLinkedInProject(yaml, "FeatureTranslate"), true);
  assert.equal(isLinkedInProject(yaml, "FeatureTranslateDomain"), true);
  assert.equal(isLinkedInProject(yaml, "AudioSession"), false);
});

test("computeReverseDeps inverts edges deterministically", () => {
  const packages = [
    { name: "FeatureTranslate", deps: ["AudioSession", "SpeechPipeline"] },
    { name: "SpeechPipeline", deps: ["AudioSession"] },
    { name: "AudioSession", deps: [] }
  ];
  const reverse = computeReverseDeps(packages);
  assert.deepEqual(reverse.get("AudioSession"), ["FeatureTranslate", "SpeechPipeline"]);
  assert.deepEqual(reverse.get("SpeechPipeline"), ["FeatureTranslate"]);
  assert.deepEqual(reverse.get("FeatureTranslate"), []);
});
