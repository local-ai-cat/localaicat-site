// Package-centric projection for the /docs/packages table. There are more
// packages (67) than modules, and the modules grid rolls packages UP into their
// owning module — so this flat view surfaces each package's own reality: who
// owns it, its kind, its own test coverage, modular state, and dependency edges.
//
// Joins three already-generated/derived sources (never hand-edit the outputs):
//   - data/module-graph.json      → deps / reverseDeps / appStoreGates / linkedInProject
//   - data/public-features.json   → ownership (feature.ownedPackages, module.packages),
//                                     kind, modular state
//   - the app repo's Packages/*   → per-package test-case count (reused from the
//                                     testing generator's counters)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  findPackageDirectories,
  countPackageTests,
  testingTier,
} from "./generate-module-testing.mjs";

const root = process.cwd();
const graphPath = path.resolve(root, "data/module-graph.json");
const featuresPath = path.resolve(root, "data/public-features.json");
const outputPath = path.resolve(root, "data/packages.json");

function parseAppRoot(args) {
  const flagIndex = args.indexOf("--app-repo");
  if (flagIndex !== -1 && args[flagIndex + 1]) {
    return path.resolve(process.cwd(), args[flagIndex + 1]);
  }
  return path.resolve(root, "../Local-AI-Chat");
}

async function main() {
  const appRoot = parseAppRoot(process.argv.slice(2));
  const graph = JSON.parse(await readFile(graphPath, "utf8"));
  const publicFeatures = JSON.parse(await readFile(featuresPath, "utf8"));

  // package name -> { owner, ownerId, ownerKind, modular } from whoever OWNS it
  // (ownedPackages for features, packages for infrastructure modules). usesPackages
  // are cross-references, not ownership, so they don't set the owner here.
  const owners = new Map();
  for (const feature of publicFeatures.features ?? []) {
    for (const pkg of feature.ownedPackages ?? []) {
      owners.set(pkg, {
        owner: feature.name,
        ownerId: feature.id,
        ownerKind: "feature",
        modular: feature.modular ?? null,
      });
    }
  }
  for (const module of publicFeatures.modules ?? []) {
    for (const pkg of module.packages ?? []) {
      owners.set(pkg, {
        owner: module.name,
        ownerId: module.id,
        ownerKind: module.kind, // engine | platform | harness | vendored
        modular: null,
      });
    }
  }

  // Per-package test-case counts (reuses the testing generator's scanners). A
  // package that lives outside Packages/ (e.g. a vendored public-org dep) simply
  // has no directory here → 0 cases / tier "none", which is honest.
  const packageDirectories = await findPackageDirectories(appRoot);
  const testCasesFor = async (name) => {
    const locations = packageDirectories.get(name);
    if (!locations || locations.length === 0) return 0;
    return countPackageTests(locations[0]);
  };

  const packages = [];
  for (const node of graph.packages ?? []) {
    const ownership = owners.get(node.name) ?? {
      owner: null,
      ownerId: null,
      ownerKind: "unowned",
      modular: null,
    };
    const cases = await testCasesFor(node.name);
    packages.push({
      name: node.name,
      owner: ownership.owner,
      ownerId: ownership.ownerId,
      ownerKind: ownership.ownerKind,
      modular: ownership.modular,
      cases,
      tier: testingTier(cases),
      deps: node.deps ?? [],
      dependents: node.reverseDeps ?? [],
      appStoreGates: node.appStoreGates ?? [],
      linkedInProject: node.linkedInProject ?? false,
    });
  }
  packages.sort((a, b) => a.name.localeCompare(b.name));

  const output = {
    schemaVersion: 1,
    updated: graph.updated ?? null,
    packages,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  const unowned = packages.filter((p) => p.ownerKind === "unowned").length;
  console.log(
    `Wrote ${packages.length} packages to ${path.relative(root, outputPath)}` +
      (unowned ? ` (${unowned} unowned — check catalog ownership)` : "") + ".",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
