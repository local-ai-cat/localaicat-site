import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import behavioralData from "../data/module-behavioral.json";
import featureData from "../data/public-features.json";
import testingData from "../data/module-testing.json";

export type Availability = "yes" | "no" | "partial" | "planned";
export type ModuleLane = "stable" | "beta" | "alpha" | "locked" | "purgatory";
export type ModuleStatus = "live" | "beta" | "wip";
export type TestingTier = "none" | "thin" | "covered" | "heavy";
export type BehavioralStatus = "untested" | "unit-only" | "behavioral";
export type ApiParity = "full" | "partial" | "none" | "notApplicable";
export type ApiLifecycleState = "present" | "partial" | "not-applicable";
export type ApiLifecycleVerb = "discover" | "execute" | "observe" | "configure" | "cancel/stop" | "reset";

export type ModuleApi = {
  parity: ApiParity;
  lifecycle: Record<ApiLifecycleVerb, ApiLifecycleState>;
  capabilities: string[];
};

export type ModuleLogging = {
  grade: string;
  signal: string;
  provisional: boolean;
};

export type PublicModule = {
  id: string;
  name: string;
  group: string | null;
  lane: ModuleLane;
  status: ModuleStatus;
  accessTier: "free" | "pro";
  platforms: string[];
  tiers: string[];
  permissions: string[];
  description: string | null;
  channels: Array<{
    key: "alpha" | "beta" | "outdoor" | "main";
    label: string;
    iOS: Availability;
    macOS: Availability;
  }>;
  caveats: Array<{ channel: string; note: string }>;
  package: string | null;
  ownedPackages: string[];
  usesPackages: string[];
  modular: "yes" | "partial" | "no";
  goldStandard: {
    grade: "gold" | "strong" | "partial" | "weak";
    gap: string;
  } | null;
  api: ModuleApi | null;
  apiPaths: string[];
};

export type ModuleTesting = {
  id: string;
  packages: string[];
  cases: number;
  tier: TestingTier;
  logging: ModuleLogging;
};

export type ModuleBehavioral = {
  id: string;
  status: BehavioralStatus;
  hasSnapshot: boolean;
  neverDriven: boolean;
};

export type ModuleBacklogItem = {
  title: string;
  description?: string;
};

export type ModuleHistoryEntry = {
  date: string;
  title: string;
  description: string;
};

export type ModuleOverlay = {
  packages?: string[];
  mediaCaption?: string;
  backlog?: ModuleBacklogItem[];
  history?: ModuleHistoryEntry[];
};

export type ModulePage = PublicModule & {
  behavioral: ModuleBehavioral;
  testing: ModuleTesting;
  overlay: ModuleOverlay;
};

export type ModuleKind = "feature" | "engine" | "platform" | "harness" | "vendored";

// Infrastructure modules (engines, platform, harness, vendored) claim the
// Packages/ directories that no user-facing feature owns. They render as rows in
// the modules table but do not carry the feature columns (channels, permissions,
// testing, Pro tier), and they do not have per-module pages yet.
export type InfrastructureModule = {
  id: string;
  name: string;
  kind: Exclude<ModuleKind, "feature">;
  description: string;
  packages: string[];
};

const modules = featureData.features as PublicModule[];
const infrastructureModules = (featureData.modules ?? []) as InfrastructureModule[];
const behavioralRows = behavioralData.modules as ModuleBehavioral[];
const testingRows = testingData.modules as ModuleTesting[];
const behavioralById = new Map(behavioralRows.map((row) => [row.id, row]));
const testingById = new Map(testingRows.map((row) => [row.id, row]));
const overlayRoot = path.join(process.cwd(), "data/module-pages");

export const moduleCatalogUpdated = featureData.updated;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, location: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${location} must be a non-empty string`);
  }
}

function readOverlay(id: string): ModuleOverlay {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid module id ${JSON.stringify(id)}`);
  const overlayPath = path.join(overlayRoot, `${id}.json`);
  if (!existsSync(overlayPath)) return {};

  const overlay: unknown = JSON.parse(readFileSync(overlayPath, "utf8"));
  if (!isObject(overlay)) throw new Error(`${overlayPath} must contain an object`);

  const packages = overlay.packages;
  if (packages !== undefined) {
    if (!Array.isArray(packages)) throw new Error(`${overlayPath}.packages must be an array`);
    packages.forEach((value, index) => assertString(value, `${overlayPath}.packages[${index}]`));
  }

  const mediaCaption = overlay.mediaCaption;
  if (mediaCaption !== undefined) assertString(mediaCaption, `${overlayPath}.mediaCaption`);

  let backlog: ModuleBacklogItem[] | undefined;
  if (overlay.backlog !== undefined) {
    if (!Array.isArray(overlay.backlog)) throw new Error(`${overlayPath}.backlog must be an array`);
    backlog = overlay.backlog.map((item, index) => {
      if (!isObject(item)) throw new Error(`${overlayPath}.backlog[${index}] must be an object`);
      assertString(item.title, `${overlayPath}.backlog[${index}].title`);
      if (item.description !== undefined) {
        assertString(item.description, `${overlayPath}.backlog[${index}].description`);
      }
      return { title: item.title, description: item.description };
    });
  }

  let history: ModuleHistoryEntry[] | undefined;
  if (overlay.history !== undefined) {
    if (!Array.isArray(overlay.history)) throw new Error(`${overlayPath}.history must be an array`);
    history = overlay.history.map((entry, index) => {
      if (!isObject(entry)) throw new Error(`${overlayPath}.history[${index}] must be an object`);
      assertString(entry.date, `${overlayPath}.history[${index}].date`);
      assertString(entry.title, `${overlayPath}.history[${index}].title`);
      assertString(entry.description, `${overlayPath}.history[${index}].description`);
      return { date: entry.date, title: entry.title, description: entry.description };
    });
  }

  return {
    packages: packages as string[] | undefined,
    mediaCaption,
    backlog,
    history
  };
}

function testingFor(id: string): ModuleTesting {
  const testing = testingById.get(id);
  if (!testing) throw new Error(`Missing generated testing data for module ${JSON.stringify(id)}`);
  return testing;
}

function behavioralFor(id: string): ModuleBehavioral {
  const behavioral = behavioralById.get(id);
  if (!behavioral) throw new Error(`Missing generated behavioral data for module ${JSON.stringify(id)}`);
  return behavioral;
}

export function getModules(): ModulePage[] {
  return modules.map((module) => ({
    ...module,
    behavioral: behavioralFor(module.id),
    testing: testingFor(module.id),
    overlay: readOverlay(module.id)
  }));
}

export function getInfrastructureModules(): InfrastructureModule[] {
  return infrastructureModules;
}

export function getModule(id: string): ModulePage | undefined {
  const module = modules.find((candidate) => candidate.id === id);
  if (!module) return undefined;
  return { ...module, behavioral: behavioralFor(id), testing: testingFor(id), overlay: readOverlay(id) };
}

function channelShips(module: PublicModule, key: PublicModule["channels"][number]["key"]) {
  const channel = module.channels.find((candidate) => candidate.key === key);
  return channel !== undefined && (channel.iOS !== "no" || channel.macOS !== "no");
}

export function releaseChannels(module: PublicModule): string[] {
  const channels = [];
  if (channelShips(module, "alpha")) channels.push("Alpha");
  if (channelShips(module, "beta")) channels.push("Beta");
  if (channelShips(module, "main") || channelShips(module, "outdoor")) channels.push("Main");
  return channels;
}

export function distributions(module: PublicModule): string[] {
  const values = [];
  if (channelShips(module, "main")) values.push("Indoor");
  if (channelShips(module, "outdoor")) values.push("Outdoor");
  return values;
}

export function moduleState(module: PublicModule): ModuleLane | ModuleStatus {
  if (module.lane === "locked" || module.lane === "purgatory") return module.lane;
  return module.status;
}

const labelOverrides: Record<string, string> = {
  wip: "Work in progress",
  none: "None",
  thin: "Thin",
  covered: "Covered",
  heavy: "Heavy"
};

export function displayLabel(value: string): string {
  return labelOverrides[value] ?? `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
