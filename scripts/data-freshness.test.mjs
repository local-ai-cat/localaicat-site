// The data/*.json the site renders are GENERATED from the Cat's docs/features.json
// by the scripts beside this file, and nothing regenerates them on build: the
// generators read a sibling checkout that does not exist on Vercel, so a prebuild
// hook would break every deploy. That left the only guard as "someone remembers",
// and on 2026-08-26 the manifest had moved to schemaVersion 11 with a new
// packageTesting key while the committed data still described schemaVersion 10 —
// the generator had been throwing for days and the site rendered a stale ledger.
//
// So the guard lives here: regenerate into memory, compare against what is
// committed, restore the files either way. It skips when the sibling Cat checkout
// is absent, which is exactly the CI/Vercel case where regeneration is impossible.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifest = path.resolve(root, "../Local-AI-Chat/docs/features.json");

const generators = [
  ["generate-public-features.mjs", "public-features.json"],
  ["generate-module-testing.mjs", "module-testing.json"],
  ["generate-module-behavioral.mjs", "module-behavioral.json"],
  ["generate-module-graph.mjs", "module-graph.json"],
  ["generate-packages.mjs", "packages.json"]
];

test("committed data/*.json match what the generators produce today", { skip: !existsSync(manifest) && "no sibling Local-AI-Chat checkout" }, () => {
  const dataPath = (name) => path.join(root, "data", name);
  const before = new Map(generators.map(([, name]) => [name, readFileSync(dataPath(name), "utf8")]));
  const stale = [];
  try {
    for (const [script, name] of generators) {
      execFileSync(process.execPath, [path.join(here, script)], { cwd: root, stdio: "pipe" });
      if (readFileSync(dataPath(name), "utf8") !== before.get(name)) stale.push(name);
    }
  } finally {
    for (const [name, contents] of before) writeFileSync(dataPath(name), contents);
  }
  assert.deepEqual(stale, [], `stale generated data: ${stale.join(", ")} — run the scripts/generate-*.mjs and commit the result`);
});
