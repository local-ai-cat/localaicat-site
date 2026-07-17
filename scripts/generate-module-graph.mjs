import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Derives the package dependency / inclusion graph that powers the Build Anatomy
// view. Reads the app repo (../Local-AI-Chat by default) directly:
//   - one entry per directory under Packages/ (67 today)
//   - deps parsed from each Package.swift's `.package(path: "../Sibling")` decls
//   - appStoreGates scanned from `#if APPSTORE_BUILD` / `#if !APPSTORE_BUILD`
//     preprocessor directives under Sources/
//   - linkedInProject from whether app/project.yml references the package path
// Output is deterministic (sorted keys + arrays) so regeneration is diff-stable.

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const outputPath = path.join(root, "data/module-graph.json");

const ignoredDirectories = new Set([
  ".build",
  ".claude",
  ".git",
  ".swiftpm",
  "DerivedData",
  "node_modules"
]);

// A gate is an actual preprocessor directive at the start of a line — not a
// mention inside a comment or string literal. Grep-level fidelity, anchored.
const gateDirectivePattern = /^\s*#if\s+!?APPSTORE_BUILD\b/;
const packagePathPattern = /\.package\(\s*path:\s*"([^"]+)"/g;

function fail(message) {
  throw new Error(`Could not generate module graph: ${message}`);
}

export function parsePackageDeps(source, knownPackageNames, selfName) {
  if (typeof source !== "string" || source.length === 0) return [];
  const known = knownPackageNames instanceof Set ? knownPackageNames : new Set(knownPackageNames);
  const deps = new Set();
  for (const match of source.matchAll(packagePathPattern)) {
    const dependencyName = path.basename(match[1]);
    if (dependencyName === selfName) continue;
    if (known.has(dependencyName)) deps.add(dependencyName);
  }
  return [...deps].sort((left, right) => left.localeCompare(right));
}

export function gateLinesInSource(source) {
  if (typeof source !== "string" || source.length === 0) return [];
  const lines = [];
  source.split("\n").forEach((line, index) => {
    if (gateDirectivePattern.test(line)) lines.push(index + 1);
  });
  return lines;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isLinkedInProject(projectYaml, name) {
  if (typeof projectYaml !== "string" || projectYaml.length === 0) return false;
  return new RegExp(`\\.\\./Packages/${escapeRegExp(name)}(?![A-Za-z0-9])`).test(projectYaml);
}

export function computeReverseDeps(packages) {
  const reverse = new Map(packages.map((pkg) => [pkg.name, new Set()]));
  for (const pkg of packages) {
    for (const dependency of pkg.deps) {
      if (reverse.has(dependency)) reverse.get(dependency).add(pkg.name);
    }
  }
  const result = new Map();
  for (const [name, dependents] of reverse) {
    result.set(name, [...dependents].sort((left, right) => left.localeCompare(right)));
  }
  return result;
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

async function scanGates(packageDirectory) {
  const sourcesDirectory = path.join(packageDirectory, "Sources");
  const files = await swiftFiles(sourcesDirectory);
  const gates = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relative = path.relative(packageDirectory, file);
    for (const line of gateLinesInSource(source)) gates.push({ file: relative, line });
  }
  return gates.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

async function packageDirectories(packagesRoot) {
  let entries;
  try {
    entries = await readdir(packagesRoot, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      fail(`Packages directory not found at ${packagesRoot}`);
    }
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readTextIfPresent(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return "";
    throw error;
  }
}

export async function generateModuleGraph(appRoot) {
  await access(path.join(appRoot, "docs/features.json"));
  const manifest = JSON.parse(await readFile(path.join(appRoot, "docs/features.json"), "utf8"));
  const updated = typeof manifest.updated === "string" ? manifest.updated : "";

  const packagesRoot = path.join(appRoot, "Packages");
  const names = await packageDirectories(packagesRoot);
  const knownNames = new Set(names);
  const projectYaml = await readTextIfPresent(path.join(appRoot, "app/project.yml"));

  const packages = [];
  for (const name of names) {
    const directory = path.join(packagesRoot, name);
    const packageSwift = await readTextIfPresent(path.join(directory, "Package.swift"));
    packages.push({
      name,
      deps: parsePackageDeps(packageSwift, knownNames, name),
      appStoreGates: await scanGates(directory),
      linkedInProject: isLinkedInProject(projectYaml, name)
    });
  }

  const reverse = computeReverseDeps(packages);
  const withReverse = packages
    .map((pkg) => ({
      name: pkg.name,
      deps: pkg.deps,
      reverseDeps: reverse.get(pkg.name) ?? [],
      appStoreGates: pkg.appStoreGates,
      linkedInProject: pkg.linkedInProject
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const output = { schemaVersion: 1, updated, packages: withReverse };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

function parseAppRoot(args) {
  const flagIndex = args.indexOf("--app-repo");
  if (flagIndex === -1) return path.resolve(root, "../Local-AI-Chat");
  const value = args[flagIndex + 1];
  if (!value) fail("--app-repo requires a path");
  return path.resolve(process.cwd(), value);
}

async function main() {
  const appRoot = parseAppRoot(process.argv.slice(2));
  const output = await generateModuleGraph(appRoot);
  const gated = output.packages.filter((pkg) => pkg.appStoreGates.length > 0).length;
  const linked = output.packages.filter((pkg) => pkg.linkedInProject).length;
  console.log(
    `Wrote graph for ${output.packages.length} packages to ${path.relative(root, outputPath)} `
    + `(${linked} linked in project.yml · ${gated} with App Store gates).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
