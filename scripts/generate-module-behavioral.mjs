import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const publicFeaturesPath = path.join(root, "data/public-features.json");
const overlayDirectory = path.join(root, "data/module-pages");
const outputPath = path.join(root, "data/module-behavioral.json");

const ignoredDirectories = new Set([".build", ".claude", ".git", "DerivedData", "node_modules"]);

function fail(message) {
  throw new Error(`Could not generate module behavioral data: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripSwiftComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function countTestDeclarations(source) {
  const lines = stripSwiftComments(source).split("\n");
  let cases = 0;
  let pendingSwiftTest = false;

  for (const line of lines) {
    const testAttributes = line.match(/@Test\b/g)?.length ?? 0;
    if (testAttributes > 0) {
      cases += testAttributes;
      pendingSwiftTest = true;
    }

    const xctestDeclarations = line.match(/\bfunc\s+test[A-Z0-9_]\w*\s*\(/g)?.length ?? 0;
    if (xctestDeclarations > 0) {
      if (!pendingSwiftTest) cases += xctestDeclarations;
      pendingSwiftTest = false;
      continue;
    }

    if (pendingSwiftTest && /\bfunc\s+\w+\s*\(/.test(line)) pendingSwiftTest = false;
  }

  return cases;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractPackageNames(description, knownPackageNames) {
  if (!description) return [];

  return [...knownPackageNames]
    .sort((left, right) => right.length - left.length || left.localeCompare(right))
    .filter((name) => {
      const boundary = `(?:^|[^A-Za-z0-9_])${escapeRegExp(name)}(?:$|[^A-Za-z0-9_])`;
      return new RegExp(boundary).test(description);
    })
    .sort((left, right) => left.localeCompare(right));
}

async function findPackageDirectories(directory, packages = new Map()) {
  const entries = await readdir(directory, { withFileTypes: true });

  if (entries.some((entry) => entry.isFile() && entry.name === "Package.swift")) {
    const name = path.basename(directory);
    const locations = packages.get(name) ?? [];
    locations.push(directory);
    packages.set(name, locations);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
    await findPackageDirectories(path.join(directory, entry.name), packages);
  }

  return packages;
}

async function swiftFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
        files.push(...await swiftFiles(entryPath));
      } else if (entry.isFile() && entry.name.endsWith(".swift")) {
        files.push(entryPath);
      }
    }
    return files;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function containsSnapshotsDirectory(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
      if (entry.name === "__Snapshots__") return true;
      if (await containsSnapshotsDirectory(path.join(directory, entry.name))) return true;
    }
    return false;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function readPackageOverrides() {
  const overrides = new Map();
  let entries;
  try {
    entries = await readdir(overlayDirectory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return overrides;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const id = entry.name.slice(0, -".json".length);
    let overlay;
    try {
      overlay = JSON.parse(await readFile(path.join(overlayDirectory, entry.name), "utf8"));
    } catch (error) {
      fail(`${entry.name} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!isObject(overlay)) fail(`${entry.name} must contain an object`);
    if (overlay.packages === undefined) continue;
    if (!Array.isArray(overlay.packages) || overlay.packages.some((name) => typeof name !== "string" || name.trim() === "")) {
      fail(`${entry.name}.packages must be an array of non-empty strings`);
    }
    overrides.set(id, [...new Set(overlay.packages)].sort((left, right) => left.localeCompare(right)));
  }

  return overrides;
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function featureAliases(feature, packages) {
  const aliases = new Set();
  const idAlias = normalize(feature.id);
  const nameAlias = normalize(feature.name.replace(/\([^)]*\)/g, ""));
  if (idAlias.length >= 5) aliases.add(idAlias);
  if (nameAlias.length >= 5) aliases.add(nameAlias);

  for (const packageName of packages) {
    const packageAlias = normalize(packageName.replace(/^(Feature|LocalAI)/, ""));
    if (packageAlias.length >= 5) aliases.add(packageAlias);
  }

  return [...aliases];
}

function importsPackage(source, packages) {
  return packages.some((packageName) => new RegExp(`^\\s*(?:@testable\\s+)?import\\s+${escapeRegExp(packageName)}\\b`, "m").test(source));
}

export function appTestOwnsFeature(file, source, feature, packages) {
  const normalizedPath = normalize(file);
  return featureAliases(feature, packages).some((alias) => normalizedPath.includes(alias)) || importsPackage(source, packages);
}

export function isBehavioralTest(file, source) {
  const uncommented = stripSwiftComments(source);
  const isXCUITest = /\bXCUIApplication\b/.test(uncommented) || (/^\s*import\s+XCTest\b/m.test(uncommented) && /\bXCUI(?:Element|Application|Remote|Device)\b/.test(uncommented));
  const isDriveTest = /alpha[-_ ]?harness|e2e|end[-_ ]?to[-_ ]?end|drive[-_ ]?test/i.test(`${file} ${uncommented}`);
  return isXCUITest || isDriveTest;
}

export function hasUIPlacements(feature) {
  return isObject(feature.uiPlacements) && Object.keys(feature.uiPlacements).length > 0;
}

export function isPureEngineFeature(feature, packages) {
  if (hasUIPlacements(feature)) return false;
  const engineGroup = typeof feature.group === "string" && /(?:^|[-_ ])(?:engine|infra)(?:$|[-_ ])/i.test(feature.group);
  const onlyEnginePackages = packages.length > 0 && packages.every((name) => /(?:Kit|Core)$/.test(name));
  return engineGroup || onlyEnginePackages;
}

function parseAppRoot(args) {
  const flagIndex = args.indexOf("--app-repo");
  if (flagIndex === -1) return path.resolve(root, "../Local-AI-Chat");
  const value = args[flagIndex + 1];
  if (!value) fail("--app-repo requires a path");
  return path.resolve(process.cwd(), value);
}

async function appTargetTestFiles(appRoot) {
  const appDirectory = path.join(appRoot, "app");
  const entries = await readdir(appDirectory, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && (entry.name.includes("UITests") || entry.name.endsWith("Tests")))
    .map((entry) => path.join(appDirectory, entry.name));
  return (await Promise.all(directories.map(swiftFiles))).flat();
}

export async function generateModuleBehavioral(appRoot) {
  const manifestPath = path.join(appRoot, "docs/features.json");
  await access(manifestPath);

  const publicFeatures = JSON.parse(await readFile(publicFeaturesPath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!isObject(publicFeatures) || !Array.isArray(publicFeatures.features)) {
    fail("data/public-features.json must contain a features array");
  }
  if (!isObject(manifest) || !Array.isArray(manifest.features)) fail("app docs/features.json must contain a features array");

  const manifestById = new Map(manifest.features.map((feature) => [feature.id, feature]));
  const packageDirectories = await findPackageDirectories(appRoot);
  const knownPackageNames = [...packageDirectories.keys()];
  const overrides = await readPackageOverrides();
  const appFiles = await appTargetTestFiles(appRoot);
  const appSources = new Map(await Promise.all(appFiles.map(async (file) => [file, await readFile(file, "utf8")])));
  const packageEvidence = new Map();

  async function evidenceForPackage(name) {
    if (packageEvidence.has(name)) return packageEvidence.get(name);
    const locations = packageDirectories.get(name);
    if (!locations) fail(`package override ${JSON.stringify(name)} does not match a Package.swift in the app repo`);
    if (locations.length !== 1) fail(`package ${JSON.stringify(name)} is ambiguous in the app repo`);
    const testsDirectory = path.join(locations[0], "Tests");
    const files = await swiftFiles(testsDirectory);
    const sources = await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")]));
    const evidence = {
      cases: sources.reduce((total, [, source]) => total + countTestDeclarations(source), 0),
      behavioral: sources.some(([file, source]) => countTestDeclarations(source) > 0 && isBehavioralTest(file, source)),
      snapshot: await containsSnapshotsDirectory(testsDirectory) || sources.some(([, source]) => /\bassertSnapshot\s*\(/.test(stripSwiftComments(source)))
    };
    packageEvidence.set(name, evidence);
    return evidence;
  }

  const modules = [];
  const unresolved = [];
  for (const publicFeature of publicFeatures.features) {
    if (!isObject(publicFeature) || typeof publicFeature.id !== "string") fail("public feature entries must have an id");
    const feature = manifestById.get(publicFeature.id);
    if (!isObject(feature)) fail(`app manifest is missing public feature ${JSON.stringify(publicFeature.id)}`);
    const packages = overrides.has(feature.id)
      ? overrides.get(feature.id)
      : extractPackageNames(feature.package, knownPackageNames);
    if (packages.length === 0) unresolved.push(feature.id);

    let cases = 0;
    let behavioral = false;
    let hasSnapshot = false;
    for (const packageName of packages) {
      const evidence = await evidenceForPackage(packageName);
      cases += evidence.cases;
      behavioral ||= evidence.behavioral;
      hasSnapshot ||= evidence.snapshot;
    }

    for (const [file, source] of appSources) {
      if (!appTestOwnsFeature(file, source, feature, packages)) continue;
      const fileCases = countTestDeclarations(source);
      cases += fileCases;
      behavioral ||= fileCases > 0 && isBehavioralTest(file, source);
      hasSnapshot ||= /\bassertSnapshot\s*\(/.test(stripSwiftComments(source));
    }

    const status = behavioral ? "behavioral" : cases > 0 ? "unit-only" : "untested";
    const interactive = hasUIPlacements(feature) || !isPureEngineFeature(feature, packages);
    modules.push({
      id: feature.id,
      status,
      hasSnapshot,
      neverDriven: status !== "behavioral" && interactive
    });
  }

  const output = { schemaVersion: 1, updated: publicFeatures.updated, modules };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return { output, unresolved };
}

async function main() {
  const appRoot = parseAppRoot(process.argv.slice(2));
  const { output, unresolved } = await generateModuleBehavioral(appRoot);
  console.log(`Wrote provisional behavioral signals for ${output.modules.length} modules to ${path.relative(root, outputPath)}.`);
  if (unresolved.length > 0) {
    console.warn(`No owning package parsed for: ${unresolved.join(", ")}. Add packages overrides to data/module-pages/<id>.json if needed.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
