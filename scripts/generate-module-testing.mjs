import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const publicFeaturesPath = path.join(root, "data/public-features.json");
const overlayDirectory = path.join(root, "data/module-pages");
const outputPath = path.join(root, "data/module-testing.json");

const ignoredDirectories = new Set([
  ".build",
  ".claude",
  ".git",
  "DerivedData",
  "node_modules"
]);

function fail(message) {
  throw new Error(`Could not generate module testing data: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInteger(value, location) {
  if (!Number.isInteger(value) || value < 0) fail(`${location} must be a non-negative integer`);
  return value;
}

export function derivedPackageTesting(manifest) {
  if (!isObject(manifest) || !Array.isArray(manifest.packageTesting)) {
    fail("app docs/features.json must contain the derived packageTesting array");
  }

  const packages = new Map();
  for (const [index, row] of manifest.packageTesting.entries()) {
    const location = `app docs/features.json packageTesting[${index}]`;
    if (!isObject(row) || !isObject(row.evidence) || !isObject(row.lock)) {
      fail(`${location} must contain evidence and lock objects`);
    }
    const name = row.evidence.package;
    if (typeof name !== "string" || name.trim() === "") fail(`${location}.evidence.package must be a non-empty string`);
    if (row.lock.package !== name) fail(`${location}.lock.package must match evidence.package`);
    if (packages.has(name)) fail(`${location} duplicates package ${JSON.stringify(name)}`);
    if (!isObject(row.evidence.counts)) fail(`${location}.evidence.counts must be an object`);
    const xctest = nonNegativeInteger(row.evidence.counts.xctest, `${location}.evidence.counts.xctest`);
    const swiftTesting = nonNegativeInteger(
      row.evidence.counts.swiftTesting,
      `${location}.evidence.counts.swiftTesting`,
    );
    if (!Array.isArray(row.evidence.suitePaths) || row.evidence.suitePaths.some((value) => typeof value !== "string")) {
      fail(`${location}.evidence.suitePaths must be an array of strings`);
    }
    if (!["push-or-pull-request", "explicit-on-demand", "orphan"].includes(row.evidence.wiredness)) {
      fail(`${location}.evidence.wiredness is not recognized`);
    }
    if (!Array.isArray(row.evidence.wiringEvidencePaths)
      || row.evidence.wiringEvidencePaths.some((value) => typeof value !== "string")) {
      fail(`${location}.evidence.wiringEvidencePaths must be an array of strings`);
    }
    if (!Array.isArray(row.evidence.ratchets)) fail(`${location}.evidence.ratchets must be an array`);
    if (!isObject(row.evidence.realSurface)) fail(`${location}.evidence.realSurface must be an object`);
    if (typeof row.lockSatisfied !== "boolean") fail(`${location}.lockSatisfied must be a boolean`);

    packages.set(name, {
      name,
      counts: { xctest, swiftTesting, total: xctest + swiftTesting },
      suitePaths: [...row.evidence.suitePaths],
      wiredness: row.evidence.wiredness,
      wiringEvidencePaths: [...row.evidence.wiringEvidencePaths],
      ratchets: row.evidence.ratchets,
      realSurface: row.evidence.realSurface,
      lock: {
        satisfied: row.lockSatisfied,
        suiteRequired: row.lock.suiteRequired,
        minimumTestCount: nonNegativeInteger(row.lock.minimumTestCount, `${location}.lock.minimumTestCount`),
        wirednessRequired: row.lock.wirednessRequired,
        requiredRatchets: row.lock.requiredRatchets,
        ...(row.lock.loweredByCommit ? { loweredByCommit: row.lock.loweredByCommit } : {}),
      },
    });
  }
  return packages;
}

export function testingTier(cases) {
  if (cases === 0) return "none";
  if (cases < 10) return "thin";
  if (cases < 30) return "covered";
  return "heavy";
}

// Provisional logging/observability grade, mirroring a first-pass audit:
// today almost everything is L0/L1 (structured logging or bare prints) and
// nothing reaches L2 (Sentry/telemetry) — that is expected and correct.
export function loggingGrade({ structured, prints, sentry, hasPackages }) {
  if (sentry > 0) return "L2";
  if (structured > 0) return "L1";
  if (!hasPackages) return "L0-L1";
  return "L0";
}

const structuredLogPattern = /DiagnosticLogger\.|ModelLinkLog\./g;
const printPattern = /\bprint\(/g;
const sentryPattern = /TelemetryRegistry|capture\(error|capture\(message/g;

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
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

export async function findPackageDirectories(directory, packages = new Map()) {
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

async function countPackageLogging(packageDirectory) {
  const files = await swiftFiles(packageDirectory);
  const signals = { structured: 0, prints: 0, sentry: 0 };
  for (const file of files) {
    const source = await readFile(file, "utf8");
    signals.structured += countMatches(source, structuredLogPattern);
    signals.prints += countMatches(source, printPattern);
    signals.sentry += countMatches(source, sentryPattern);
  }
  return signals;
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

function parseAppRoot(args) {
  const flagIndex = args.indexOf("--app-repo");
  if (flagIndex === -1) return path.resolve(root, "../Local-AI-Chat");
  const value = args[flagIndex + 1];
  if (!value) fail("--app-repo requires a path");
  return path.resolve(process.cwd(), value);
}

export async function generateModuleTesting(appRoot) {
  const manifestPath = path.join(appRoot, "docs/features.json");
  await access(manifestPath);

  const publicFeatures = JSON.parse(await readFile(publicFeaturesPath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!isObject(publicFeatures) || !Array.isArray(publicFeatures.features)) {
    fail("data/public-features.json must contain a features array");
  }

  const packageTesting = derivedPackageTesting(manifest);
  const packageDirectories = await findPackageDirectories(appRoot);
  const knownPackageNames = [...packageTesting.keys()];
  const overrides = await readPackageOverrides();
  const packageLoggingSignals = new Map();

  async function testsForPackage(name) {
    const testing = packageTesting.get(name);
    if (!testing) fail(`package override ${JSON.stringify(name)} does not match derived packageTesting data`);
    return testing.counts.total;
  }

  async function loggingForPackage(name) {
    if (packageLoggingSignals.has(name)) return packageLoggingSignals.get(name);
    const locations = packageDirectories.get(name);
    if (!locations) fail(`package override ${JSON.stringify(name)} does not match a Package.swift in the app repo`);
    if (locations.length !== 1) fail(`package ${JSON.stringify(name)} is ambiguous in the app repo`);
    const signals = await countPackageLogging(locations[0]);
    packageLoggingSignals.set(name, signals);
    return signals;
  }

  const modules = [];
  for (const feature of publicFeatures.features) {
    if (!isObject(feature) || typeof feature.id !== "string") fail("public feature entries must have an id");
    const packages = overrides.has(feature.id)
      ? overrides.get(feature.id)
      : extractPackageNames(feature.package, knownPackageNames);
    let cases = 0;
    for (const packageName of packages) cases += await testsForPackage(packageName);

    const logging = { structured: 0, prints: 0, sentry: 0 };
    for (const packageName of packages) {
      const signals = await loggingForPackage(packageName);
      logging.structured += signals.structured;
      logging.prints += signals.prints;
      logging.sentry += signals.sentry;
    }
    const hasPackages = packages.length > 0;
    const grade = loggingGrade({ ...logging, hasPackages });
    const signal = hasPackages
      ? `structured=${logging.structured} print=${logging.prints} sentry=${logging.sentry}`
      : "app-target — see logging audit";

    modules.push({
      id: feature.id,
      packages,
      cases,
      tier: testingTier(cases),
      logging: { grade, signal, provisional: true }
    });
  }

  const output = {
    schemaVersion: 2,
    updated: publicFeatures.updated,
    modules
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

async function main() {
  const appRoot = parseAppRoot(process.argv.slice(2));
  const output = await generateModuleTesting(appRoot);
  const overrides = await readPackageOverrides();
  const unresolved = output.modules
    .filter((module) => module.packages.length === 0 && !overrides.has(module.id))
    .map((module) => module.id);
  console.log(`Wrote testing tiers for ${output.modules.length} modules to ${path.relative(root, outputPath)}.`);
  if (unresolved.length > 0) {
    console.warn(`No owning package parsed for: ${unresolved.join(", ")}. Add packages overrides to data/module-pages/<id>.json if needed.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
