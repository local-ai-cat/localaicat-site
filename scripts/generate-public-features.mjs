import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.resolve(root, "../Local-AI-Chat/docs/features.json");
const outputPath = path.resolve(root, "data/public-features.json");

const allowedTopLevelKeys = new Set([
  "$comment", "accessTiers", "apiAxis", "capabilities", "channels", "features", "lanes",
  "permissionCatalog", "platformAxis", "schemaVersion", "uiPlacementKinds", "updated"
]);
const allowedFeatureKeys = new Set([
  "api", "builds", "caveats", "goldStandard", "group", "id", "internal",
  "lane", "modular", "name", "notes", "package", "permissions", "platforms",
  "requirements", "stagedForPromotion", "status", "target", "uiPlacements"
]);
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

function validateManifest(manifest) {
  if (!isObject(manifest)) fail("root must be an object");
  assertKnownKeys(manifest, allowedTopLevelKeys, "root");
  if (manifest.schemaVersion !== 5 && manifest.schemaVersion !== 6) fail(`unsupported schemaVersion ${JSON.stringify(manifest.schemaVersion)}`);
  if (typeof manifest.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.updated)) {
    fail("updated must be an ISO date");
  }
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

function projectFeature(feature) {
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
    modular: feature.modular,
    goldStandard: feature.goldStandard ?? null
  };
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

  const features = manifest.features
    .filter((feature) => !feature.internal)
    .map(projectFeature);
  const output = { schemaVersion: 3, updated: manifest.updated, features };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${features.length} public features to ${path.relative(root, outputPath)}.`);
}

await main();
