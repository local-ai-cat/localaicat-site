import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.resolve(root, "../Local-AI-Chat/docs/features.json");
const openApiPath = path.resolve(root, "../Local-AI-Chat/docs/localapi-openapi.json");
const outputPath = path.resolve(root, "data/public-features.json");

// Maps an api capability (from features.json api.capabilities) or an inferred
// keyword (from the feature id/name) to Local API operation-path substrings.
// The matched paths are the "headless API" surface we cite on each module page.
const apiPathHintsByKey = {
  speech: ["/transcription", "/audio/transcriptions", "/studio"],
  modelDownloads: ["/models", "/model"],
  modelLifecycle: ["/models", "/model"],
  model: ["/models", "/model"],
  externalModels: ["/models", "/modellink", "/compute"],
  localApi: ["/v1/local/"],
  webFetch: ["/chat/completions", "/responses", "/messages"],
  chat: ["/chat/completions", "/responses", "/messages"],
  translate: ["/translation", "/transcription"],
  workbench: ["/workbench"],
  studio: ["/studio"],
  record: ["/transcription/recordings"],
  update: ["/update"],
  vnc: ["/compute", "/vnc"]
};
const inferredKeywordKeys = [
  "speech", "chat", "translate", "workbench", "studio", "record", "update", "vnc", "model"
];
const maxApiPaths = 10;

const allowedTopLevelKeys = new Set([
  "$comment", "accessTiers", "apiAxis", "capabilities", "channels", "features", "lanes",
  "modules", "permissionCatalog", "platformAxis", "schemaVersion", "uiPlacementKinds", "updated"
]);
const allowedFeatureKeys = new Set([
  "api", "builds", "caveats", "goldStandard", "group", "id", "internal",
  "lane", "modular", "name", "notes", "ownedPackages", "package", "permissions", "platforms",
  "requirements", "stagedForPromotion", "status", "target", "uiPlacements", "usesPackages"
]);
// Infrastructure modules (engines / platform / harness / vendored) are projected
// verbatim EXCEPT `notes`, which carries internal nuance (deletion-candidate remarks,
// migration TODOs) that is not for the public site.
const allowedModuleKeys = new Set(["description", "id", "kind", "name", "notes", "packages"]);
const moduleKindValues = new Set(["feature", "engine", "platform", "harness", "vendored"]);
const buildChannels = ["alpha", "beta", "main", "outdoor"];
const platforms = ["iOS", "macOS"];
const availabilityValues = new Set(["yes", "no", "partial", "planned"]);
const laneValues = new Set(["stable", "beta", "alpha", "locked", "purgatory"]);
const statusValues = new Set(["live", "beta", "wip"]);
const accessTierValues = new Set(["free", "pro"]);
const modularValues = new Set(["yes", "partial", "no"]);
const gradeValues = new Set(["gold", "strong", "partial", "weak"]);
const permissionLabels = {
  accessibility: "Accessibility",
  alarmKit: "Alarms",
  appleEvents: "Automation",
  appleMusic: "Apple Music",
  bluetooth: "Bluetooth",
  calendar: "Calendar",
  camera: "Camera",
  healthKit: "Health",
  inputMonitoring: "Input Monitoring",
  localNetwork: "Local Network",
  microphone: "Microphone",
  none: "No special permission",
  screenRecording: "Screen Recording",
  speechRecognition: "Speech Recognition"
};
const channelLabels = {
  alpha: "Alpha",
  beta: "Beta",
  outdoor: "Direct Download",
  main: "App Store"
};

function fail(message) {
  throw new Error(`Invalid feature manifest: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertKnownKeys(object, allowed, location) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) fail(`${location} contains unknown key ${JSON.stringify(key)}`);
  }
}

function validateAvailabilityGrid(grid, location) {
  if (!isObject(grid)) fail(`${location} must be an object`);
  const keys = Object.keys(grid);
  if (keys.length !== platforms.length || platforms.some((key) => !keys.includes(key))) {
    fail(`${location} must contain exactly iOS and macOS`);
  }
  for (const platform of platforms) {
    if (!availabilityValues.has(grid[platform])) {
      fail(`${location}.${platform} has unknown availability ${JSON.stringify(grid[platform])}`);
    }
  }
}

function validateStringArray(value, location) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    fail(`${location} must be an array of non-empty strings`);
  }
}

export function validateModules(modules) {
  if (!Array.isArray(modules)) fail("modules must be an array");
  modules.forEach((module, index) => {
    const location = `modules[${index}]`;
    if (!isObject(module)) fail(`${location} must be an object`);
    assertKnownKeys(module, allowedModuleKeys, location);
    if (typeof module.id !== "string" || module.id.trim() === "") fail(`${location}.id must be a non-empty string`);
    if (typeof module.name !== "string" || module.name.trim() === "") fail(`${location}.name must be a non-empty string`);
    if (!moduleKindValues.has(module.kind)) fail(`${location}.kind has unknown value ${JSON.stringify(module.kind)}`);
    if (typeof module.description !== "string" || module.description.trim() === "") fail(`${location}.description must be a non-empty string`);
    validateStringArray(module.packages, `${location}.packages`);
    if (module.notes !== undefined && typeof module.notes !== "string") fail(`${location}.notes must be a string`);
  });
}

function validateManifest(manifest) {
  if (!isObject(manifest)) fail("root must be an object");
  assertKnownKeys(manifest, allowedTopLevelKeys, "root");
  if (![5, 6, 7].includes(manifest.schemaVersion)) fail(`unsupported schemaVersion ${JSON.stringify(manifest.schemaVersion)}`);
  if (typeof manifest.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.updated)) {
    fail("updated must be an ISO date");
  }
  if (manifest.modules !== undefined) validateModules(manifest.modules);
  if (!Array.isArray(manifest.features)) fail("features must be an array");

  manifest.features.forEach((feature, index) => {
    const location = `features[${index}]`;
    if (!isObject(feature)) fail(`${location} must be an object`);
    assertKnownKeys(feature, allowedFeatureKeys, location);
    if (typeof feature.id !== "string" || feature.id.trim() === "") fail(`${location}.id must be a non-empty string`);
    if (typeof feature.name !== "string" || feature.name.trim() === "") fail(`${location}.name must be a non-empty string`);
    if (typeof feature.internal !== "boolean") fail(`${location}.internal must be a boolean`);
    if (!laneValues.has(feature.lane)) fail(`${location}.lane has unknown value ${JSON.stringify(feature.lane)}`);
    if (!statusValues.has(feature.status)) fail(`${location}.status has unknown value ${JSON.stringify(feature.status)}`);
    if (!modularValues.has(feature.modular)) fail(`${location}.modular has unknown value ${JSON.stringify(feature.modular)}`);
    if (feature.notes !== undefined && typeof feature.notes !== "string") fail(`${location}.notes must be a string`);
    if (feature.package !== undefined && typeof feature.package !== "string") fail(`${location}.package must be a string`);
    if (feature.ownedPackages !== undefined) validateStringArray(feature.ownedPackages, `${location}.ownedPackages`);
    if (feature.usesPackages !== undefined) validateStringArray(feature.usesPackages, `${location}.usesPackages`);
    if (!isObject(feature.requirements)) fail(`${location}.requirements must be an object`);
    assertKnownKeys(feature.requirements, new Set(["minTier"]), `${location}.requirements`);
    if (!accessTierValues.has(feature.requirements.minTier)) {
      fail(`${location}.requirements.minTier has unknown value ${JSON.stringify(feature.requirements.minTier)}`);
    }
    if (feature.goldStandard !== undefined) {
      if (!isObject(feature.goldStandard)) fail(`${location}.goldStandard must be an object`);
      if (!gradeValues.has(feature.goldStandard.grade)) {
        fail(`${location}.goldStandard.grade has unknown value ${JSON.stringify(feature.goldStandard.grade)}`);
      }
      if (typeof feature.goldStandard.gap !== "string") fail(`${location}.goldStandard.gap must be a string`);
    }
    if (feature.caveats !== undefined) {
      if (!Array.isArray(feature.caveats)) fail(`${location}.caveats must be an array`);
      feature.caveats.forEach((caveat, caveatIndex) => {
        const caveatLocation = `${location}.caveats[${caveatIndex}]`;
        if (!isObject(caveat)) fail(`${caveatLocation} must be an object`);
        if (!(caveat.scope in channelLabels)) fail(`${caveatLocation}.scope has unknown value ${JSON.stringify(caveat.scope)}`);
        if (typeof caveat.note !== "string" || caveat.note.trim() === "") fail(`${caveatLocation}.note must be a non-empty string`);
      });
    }
    if (!Array.isArray(feature.permissions) || feature.permissions.some((value) => typeof value !== "string")) {
      fail(`${location}.permissions must be a string array`);
    }
    for (const permission of feature.permissions) {
      if (!(permission in permissionLabels)) fail(`${location}.permissions contains unknown value ${JSON.stringify(permission)}`);
    }
    validateAvailabilityGrid(feature.platforms, `${location}.platforms`);
    if (!isObject(feature.builds)) fail(`${location}.builds must be an object`);
    const channelKeys = Object.keys(feature.builds);
    if (channelKeys.length !== buildChannels.length || buildChannels.some((key) => !channelKeys.includes(key))) {
      fail(`${location}.builds must contain exactly ${buildChannels.join(", ")}`);
    }
    for (const channel of buildChannels) validateAvailabilityGrid(feature.builds[channel], `${location}.builds.${channel}`);
  });
}

function availablePlatforms(grid) {
  return platforms.filter((platform) => grid[platform] !== "no");
}

function hasAvailability(feature, channels) {
  return channels.some((channel) => availablePlatforms(feature.builds[channel]).length > 0);
}

function matchedApiPaths(feature, openApiPaths) {
  const keys = new Set(feature.api?.capabilities ?? []);
  const haystack = `${feature.id} ${feature.name}`.toLowerCase();
  for (const keyword of inferredKeywordKeys) {
    if (haystack.includes(keyword)) keys.add(keyword);
  }

  const substrings = new Set();
  for (const key of keys) {
    for (const hint of apiPathHintsByKey[key] ?? []) substrings.add(hint);
  }
  if (substrings.size === 0) return [];

  const hints = [...substrings];
  const matched = openApiPaths.filter((operationPath) => hints.some((hint) => operationPath.includes(hint)));
  return [...new Set(matched)].sort().slice(0, maxApiPaths);
}

export function projectFeature(feature, openApiPaths) {
  const tiers = [];
  if (hasAvailability(feature, ["alpha"])) tiers.push("Alpha");
  if (hasAvailability(feature, ["beta"])) tiers.push("Beta");
  if (hasAvailability(feature, ["main", "outdoor"])) tiers.push("Stable");

  const channels = ["alpha", "beta", "outdoor", "main"].map((key) => ({
    key,
    label: channelLabels[key],
    iOS: feature.builds[key].iOS,
    macOS: feature.builds[key].macOS
  }));

  return {
    id: feature.id,
    name: feature.name,
    group: feature.group ?? null,
    lane: feature.lane,
    status: feature.status,
    accessTier: feature.requirements.minTier,
    platforms: availablePlatforms(feature.platforms),
    tiers,
    permissions: feature.permissions.map((permission) => permissionLabels[permission]),
    description: feature.notes ?? null,
    channels,
    caveats: (feature.caveats ?? []).map((caveat) => ({
      channel: channelLabels[caveat.scope],
      note: caveat.note
    })),
    package: feature.package ?? null,
    ownedPackages: [...(feature.ownedPackages ?? [])].sort(),
    usesPackages: [...(feature.usesPackages ?? [])].sort(),
    modular: feature.modular,
    goldStandard: feature.goldStandard ?? null,
    api: feature.api ?? null,
    apiPaths: matchedApiPaths(feature, openApiPaths)
  };
}

export function projectModule(module) {
  return {
    id: module.id,
    name: module.name,
    kind: module.kind,
    description: module.description,
    packages: [...module.packages].sort()
  };
}

async function readOpenApiPaths() {
  try {
    await access(openApiPath);
  } catch {
    return [];
  }
  try {
    const document = JSON.parse(await readFile(openApiPath, "utf8"));
    if (!isObject(document) || !isObject(document.paths)) return [];
    return Object.keys(document.paths);
  } catch {
    return [];
  }
}

async function main() {
  try {
    await access(sourcePath);
  } catch {
    await access(outputPath);
    console.log(`Source manifest not found; keeping committed snapshot at ${path.relative(root, outputPath)}.`);
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(sourcePath, "utf8"));
  } catch (error) {
    fail(`could not parse JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateManifest(manifest);

  const openApiPaths = await readOpenApiPaths();
  const features = manifest.features
    .filter((feature) => !feature.internal)
    .map((feature) => projectFeature(feature, openApiPaths));
  const modules = (manifest.modules ?? [])
    .map((module) => projectModule(module))
    .sort((left, right) => left.id.localeCompare(right.id));
  const output = { schemaVersion: 4, updated: manifest.updated, features, modules };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${features.length} public features and ${modules.length} infrastructure modules to ${path.relative(root, outputPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
