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

export function testingTier(cases) {
  if (cases === 0) return "none";
  if (cases < 10) return "thin";
  if (cases < 30) return "covered";
  return "heavy";
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

    if (pendingSwiftTest && /\bfunc\s+\w+\s*\(/.test(line)) {
      pendingSwiftTest = false;
    }
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

async function countPackageTests(packageDirectory) {
  const files = await swiftFiles(path.join(packageDirectory, "Tests"));
  let cases = 0;
  for (const file of files) {
    cases += countTestDeclarations(await readFile(file, "utf8"));
  }
  return cases;
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
  await access(path.join(appRoot, "docs/features.json"));

  const publicFeatures = JSON.parse(await readFile(publicFeaturesPath, "utf8"));
  if (!isObject(publicFeatures) || !Array.isArray(publicFeatures.features)) {
    fail("data/public-features.json must contain a features array");
  }

  const packageDirectories = await findPackageDirectories(appRoot);
  const knownPackageNames = [...packageDirectories.keys()];
  const overrides = await readPackageOverrides();
  const packageTestCounts = new Map();

  async function testsForPackage(name) {
    if (packageTestCounts.has(name)) return packageTestCounts.get(name);
    const locations = packageDirectories.get(name);
    if (!locations) fail(`package override ${JSON.stringify(name)} does not match a Package.swift in the app repo`);
    if (locations.length !== 1) fail(`package ${JSON.stringify(name)} is ambiguous in the app repo`);
    const cases = await countPackageTests(locations[0]);
    packageTestCounts.set(name, cases);
    return cases;
  }

  const modules = [];
  for (const feature of publicFeatures.features) {
    if (!isObject(feature) || typeof feature.id !== "string") fail("public feature entries must have an id");
    const packages = overrides.has(feature.id)
      ? overrides.get(feature.id)
      : extractPackageNames(feature.package, knownPackageNames);
    let cases = 0;
    for (const packageName of packages) cases += await testsForPackage(packageName);
    modules.push({ id: feature.id, packages, cases, tier: testingTier(cases) });
  }

  const output = {
    schemaVersion: 1,
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
