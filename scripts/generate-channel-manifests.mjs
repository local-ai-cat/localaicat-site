// What each update channel is ACTUALLY serving, per feature.
//
// The Modules page renders docs/features.json at trunk head, which says what a
// build cut right now would contain. That is not what a Direct Download user
// has: on 2026-09-02 the stable DMG was build 238 from July with 3,500 trunk
// commits behind it. This generator reads the live Sparkle appcast, takes the
// newest item per channel, maps its build number to the bookkeeping tag the
// release scripts push (`released/v<ver>+<build>`, `beta/...`, `alpha/...`),
// and projects the manifest AT THAT TAG. The result is the manifest as it was
// when each channel's binary was cut — a snapshot, stamped with when it was
// synced, committed to data/ like the other generated files.
//
// It is deliberately NOT part of the data-freshness test: its inputs are the
// network (the appcast) and a moving trunk (the commits-behind count), so
// "stale" is a fact about the stamp, not a bug. Re-run it after a release:
//
//   npm run sync:channels            # or
//   node scripts/generate-channel-manifests.mjs [--app-repo <path>] [--appcast <file>]
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root = process.cwd();
const outputPath = path.resolve(root, "data/channel-manifests.json");
const manifestPathInRepo = "docs/features.json";
const trunkCandidates = ["origin/outdoor-cat", "outdoor-cat", "HEAD"];

export const appcastURL = "https://github.com/local-ai-cat/localaicat-site/releases/latest/download/appcast.xml";

// `buildsKey` is the column of a feature's `builds` grid that describes this
// channel's binary; `tagPrefixes` are tried in order (stable has carried two
// prefixes over time: `released/` for a published build, `release/` older).
export const channelDefinitions = [
  { key: "outdoor", label: "Direct Download", sparkleChannel: "stable", buildsKey: "outdoor", tagPrefixes: ["released/v", "release/v"] },
  { key: "beta", label: "Beta", sparkleChannel: "beta", buildsKey: "beta", tagPrefixes: ["beta/v"] },
  { key: "alpha", label: "Alpha", sparkleChannel: "alpha", buildsKey: "alpha", tagPrefixes: ["alpha/v"] }
];

const platforms = ["iOS", "macOS"];
const availabilityValues = new Set(["yes", "no", "partial", "planned"]);

function fail(message) {
  throw new Error(`channel manifests: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function elementText(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? match[1].trim() : null;
}

// The appcast is small and regular (Sparkle's generate_appcast output plus the
// beta/alpha items the release scripts merge in), so a regex walk over <item>
// blocks is enough and keeps the site free of an XML dependency.
export function parseAppcast(xml) {
  const items = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/g) ?? []) {
    const build = Number.parseInt(elementText(block, "sparkle:version") ?? "", 10);
    const version = elementText(block, "sparkle:shortVersionString");
    if (!Number.isInteger(build) || !version) fail("an <item> is missing sparkle:version or sparkle:shortVersionString");
    const pubDate = elementText(block, "pubDate");
    const published = pubDate ? new Date(pubDate) : null;
    const enclosure = block.match(/<enclosure\b[^>]*\burl="([^"]+)"/);
    items.push({
      channel: elementText(block, "sparkle:channel") ?? "stable",
      version,
      build,
      publishedAt: published && !Number.isNaN(published.valueOf()) ? published.toISOString().slice(0, 10) : null,
      downloadURL: enclosure ? enclosure[1] : null
    });
  }
  if (items.length === 0) fail("appcast has no <item> entries");
  return items;
}

// Sparkle's own rule: the newest build number wins within a channel.
export function latestPerChannel(items) {
  const latest = new Map();
  for (const item of items) {
    const current = latest.get(item.channel);
    if (!current || item.build > current.build) latest.set(item.channel, item);
  }
  return latest;
}

// The bookkeeping tags carry the TRAIN version (`beta/v1.4.0+336`), while the
// appcast carries the display version (`1.4.0-b5`); the prerelease index is a
// per-version counter, not part of the tag. Try the train form first, then the
// display form in case a script ever tags with it.
export function tagCandidates(definition, item) {
  const train = item.version.replace(/-(?:a|b)\d+$/, "");
  const versions = train === item.version ? [train] : [train, item.version];
  return definition.tagPrefixes.flatMap((prefix) => versions.map((version) => `${prefix}${version}+${item.build}`));
}

function validateGrid(grid, location) {
  if (!isObject(grid)) fail(`${location} must be an object`);
  for (const platform of platforms) {
    if (!availabilityValues.has(grid[platform])) fail(`${location}.${platform} has unknown availability ${JSON.stringify(grid[platform])}`);
  }
}

// Reads the OLD manifest shapes too: the stable build's manifest can be many
// schema versions behind the generator that projects trunk head. Only the
// fields every schema has carried (id, name, status, lane, builds) are used.
export function projectManifest(manifest, buildsKey) {
  if (!isObject(manifest)) fail("manifest root must be an object");
  if (!Array.isArray(manifest.features)) fail("manifest.features must be an array");
  const features = {};
  let shippingCount = 0;
  manifest.features.forEach((feature, index) => {
    const location = `features[${index}]`;
    if (!isObject(feature)) fail(`${location} must be an object`);
    if (feature.internal === true) return;
    if (typeof feature.id !== "string" || feature.id.trim() === "") fail(`${location}.id must be a non-empty string`);
    if (typeof feature.name !== "string" || feature.name.trim() === "") fail(`${location}.name must be a non-empty string`);
    if (typeof feature.status !== "string") fail(`${location}.status must be a string`);
    if (typeof feature.lane !== "string") fail(`${location}.lane must be a string`);
    if (!isObject(feature.builds)) fail(`${location}.builds must be an object`);
    const grid = feature.builds[buildsKey];
    validateGrid(grid, `${location}.builds.${buildsKey}`);
    if (platforms.some((platform) => grid[platform] !== "no")) shippingCount += 1;
    features[feature.id] = { name: feature.name, status: feature.status, lane: feature.lane, iOS: grid.iOS, macOS: grid.macOS };
  });
  const ordered = Object.fromEntries(Object.keys(features).sort().map((id) => [id, features[id]]));
  return {
    manifest: {
      schemaVersion: manifest.schemaVersion ?? null,
      updated: typeof manifest.updated === "string" ? manifest.updated : null,
      featureCount: Object.keys(ordered).length,
      shippingCount
    },
    features: ordered
  };
}

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function tryGit(repo, args) {
  try {
    return git(repo, args);
  } catch {
    return null;
  }
}

function resolveTag(repo, candidates) {
  for (const tag of candidates) {
    const commit = tryGit(repo, ["rev-parse", "--verify", "--quiet", `${tag}^{commit}`]);
    if (commit) return { tag, commit };
  }
  return null;
}

function resolveTrunk(repo) {
  for (const ref of trunkCandidates) {
    const commit = tryGit(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    if (commit) return { ref, commit };
  }
  fail(`no trunk ref found in ${repo} (tried ${trunkCandidates.join(", ")})`);
}

export async function generateChannelManifests({ appRoot, appcastXml, syncedOn }) {
  const latest = latestPerChannel(parseAppcast(appcastXml));
  const trunk = resolveTrunk(appRoot);
  const channels = channelDefinitions.map((definition) => {
    const item = latest.get(definition.sparkleChannel);
    if (!item) fail(`appcast has no item on the ${JSON.stringify(definition.sparkleChannel)} channel`);
    const candidates = tagCandidates(definition, item);
    const resolved = resolveTag(appRoot, candidates);
    if (!resolved) {
      fail(`${definition.label} serves ${item.version} build ${item.build} but none of ${candidates.join(", ")} exists in ${appRoot} — fetch tags, or the release bookkeeping is missing`);
    }
    const manifestSource = tryGit(appRoot, ["show", `${resolved.tag}:${manifestPathInRepo}`]);
    if (manifestSource === null) fail(`${resolved.tag} has no ${manifestPathInRepo}`);
    let manifest;
    try {
      manifest = JSON.parse(manifestSource);
    } catch (error) {
      fail(`${resolved.tag}:${manifestPathInRepo} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    const projected = projectManifest(manifest, definition.buildsKey);
    return {
      key: definition.key,
      label: definition.label,
      sparkleChannel: definition.sparkleChannel,
      version: item.version,
      build: item.build,
      publishedAt: item.publishedAt,
      downloadURL: item.downloadURL,
      tag: resolved.tag,
      commit: resolved.commit.slice(0, 9),
      commitDate: git(appRoot, ["log", "-1", "--format=%cs", resolved.commit]),
      trunkCommitsSince: Number.parseInt(git(appRoot, ["rev-list", "--count", `${resolved.commit}..${trunk.commit}`]), 10),
      ...projected
    };
  });
  return {
    schemaVersion: 1,
    synced: syncedOn,
    appcast: appcastURL,
    trunk: { ref: trunk.ref, commit: trunk.commit.slice(0, 9), date: git(appRoot, ["log", "-1", "--format=%cs", trunk.commit]) },
    channels
  };
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value) fail(`${flag} requires a value`);
  return value;
}

function parseAppRoot(args) {
  const flag = flagValue(args, "--app-repo");
  if (flag) return path.resolve(process.cwd(), flag);
  return process.env.LOCAL_AI_CHAT_ROOT ?? path.resolve(root, "../Local-AI-Chat");
}

async function loadAppcast(args) {
  const local = flagValue(args, "--appcast");
  if (local) return readFile(path.resolve(process.cwd(), local), "utf8");
  const response = await fetch(appcastURL);
  if (!response.ok) fail(`fetching ${appcastURL} returned HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const args = process.argv.slice(2);
  const appRoot = parseAppRoot(args);
  const output = await generateChannelManifests({
    appRoot,
    appcastXml: await loadAppcast(args),
    syncedOn: new Date().toISOString().slice(0, 10)
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  for (const channel of output.channels) {
    console.log(`${channel.label}: ${channel.version} build ${channel.build} (${channel.tag}, ${channel.trunkCommitsSince} trunk commits behind) — ${channel.manifest.shippingCount}/${channel.manifest.featureCount} features shipping`);
  }
  console.log(`Wrote ${path.relative(root, outputPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
