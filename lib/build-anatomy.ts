// Pure model behind the grid's build lens. Given the public feature catalog, the
// infrastructure modules, and the derived package graph, it computes — per build
// flavor — whether a package (and, aggregated up, a module row) is linked,
// partially included, or stripped, and why. No React, no data imports: callers
// pass the generated JSON in so this stays deterministic and unit-checkable.

export type Flavor = "indoor" | "outdoor" | "beta" | "alpha";
export type ChannelKey = "main" | "outdoor" | "beta" | "alpha";
export type PackageState = "linked" | "partial" | "stripped";
export type PackageKind = "feature" | "engine" | "platform" | "harness" | "vendored";
export type Availability = "yes" | "no" | "partial" | "planned";

export type FeatureInput = {
  id: string;
  name: string;
  ownedPackages: string[];
  usesPackages: string[];
  channels: Array<{ key: ChannelKey; iOS: Availability; macOS: Availability }>;
};

export type InfraModuleInput = {
  id: string;
  name: string;
  kind: Exclude<PackageKind, "feature">;
  description: string;
  packages: string[];
};

export type GraphPackage = {
  name: string;
  deps: string[];
  reverseDeps: string[];
  appStoreGates: Array<{ file: string; line: number }>;
  linkedInProject: boolean;
};

export type GraphInput = { packages: GraphPackage[] };

export const flavorOrder: Flavor[] = ["indoor", "outdoor", "beta", "alpha"];

export const flavorLabels: Record<Flavor, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  beta: "Beta",
  alpha: "Alpha"
};

export const flavorBlurbs: Record<Flavor, string> = {
  indoor: "App Store · sandboxed",
  outdoor: "Direct download · unsandboxed",
  beta: "Sparkle beta channel",
  alpha: "Daily agent / dev channel"
};

const flavorChannel: Record<Flavor, ChannelKey> = {
  indoor: "main",
  outdoor: "outdoor",
  beta: "beta",
  alpha: "alpha"
};

export const stateGlyphs: Record<PackageState, string> = {
  linked: "●",
  partial: "◐",
  stripped: "✂"
};

export const stateLabels: Record<PackageState, string> = {
  linked: "Linked",
  partial: "Partial",
  stripped: "Stripped"
};

type FeatureInclusion = "linked" | "partial" | "out";

export type PackageNode = {
  name: string;
  kind: PackageKind;
  moduleId: string;
  moduleName: string;
  deps: string[];
  reverseDeps: string[];
  gates: Array<{ file: string; line: number }>;
  linkedInProject: boolean;
};

export type PackageFlavorState = {
  state: PackageState;
  reason: string | null;
};

// Sentinel module id for packages owned by no public feature/module (e.g. an
// unclaimed or internal-only package) — they have no public owner, so they are
// never counted as shipping in any public flavor.
const INTERNAL_MODULE_ID = "";

export type BuildModel = {
  nodes: Map<string, PackageNode>;
  order: string[];
  consumersByPackage: Map<string, Set<string>>;
  featureById: Map<string, FeatureInput>;
};

function closure(seed: Iterable<string>, edges: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...seed];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const next of edges.get(current) ?? []) {
      if (!result.has(next)) {
        result.add(next);
        stack.push(next);
      }
    }
  }
  return result;
}

export function buildModel(
  features: FeatureInput[],
  infraModules: InfraModuleInput[],
  graph: GraphInput
): BuildModel {
  const nodes = new Map<string, PackageNode>();
  const depEdges = new Map<string, string[]>();

  for (const pkg of graph.packages) {
    depEdges.set(pkg.name, pkg.deps);
    nodes.set(pkg.name, {
      name: pkg.name,
      kind: "platform", // provisional; overwritten by ownership below
      moduleId: "",
      moduleName: "",
      deps: pkg.deps,
      reverseDeps: pkg.reverseDeps,
      gates: pkg.appStoreGates,
      linkedInProject: pkg.linkedInProject
    });
  }

  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  // Feature-owned packages take the "feature" kind and point back at their owner.
  for (const feature of features) {
    for (const name of feature.ownedPackages) {
      const node = nodes.get(name);
      if (!node) continue;
      node.kind = "feature";
      node.moduleId = feature.id;
      node.moduleName = feature.name;
    }
  }

  // Infrastructure modules claim the remaining packages with their own kind.
  for (const module of infraModules) {
    for (const name of module.packages) {
      const node = nodes.get(name);
      if (!node) continue;
      node.kind = module.kind;
      node.moduleId = module.id;
      node.moduleName = module.name;
    }
  }

  // A feature "consumes" every package reachable from the ones it owns or uses,
  // following dependency edges downward. Invert to consumers-by-package.
  const consumersByPackage = new Map<string, Set<string>>();
  for (const name of nodes.keys()) consumersByPackage.set(name, new Set());
  for (const feature of features) {
    const seeds = [...feature.ownedPackages, ...feature.usesPackages].filter((name) => nodes.has(name));
    const reached = new Set<string>(seeds);
    for (const name of closure(seeds, depEdges)) reached.add(name);
    for (const name of reached) consumersByPackage.get(name)?.add(feature.id);
  }

  const order = [...nodes.keys()].sort((a, b) => a.localeCompare(b));
  return { nodes, order, consumersByPackage, featureById };
}

function featureInclusion(feature: FeatureInput, flavor: Flavor): FeatureInclusion {
  const channel = feature.channels.find((entry) => entry.key === flavorChannel[flavor]);
  if (!channel) return "out";
  const cells: Availability[] = [channel.iOS, channel.macOS];
  if (cells.some((cell) => cell === "yes")) return "linked";
  if (cells.some((cell) => cell === "partial")) return "partial";
  return "out";
}

export function isFeatureInFlavor(feature: FeatureInput, flavor: Flavor): boolean {
  return featureInclusion(feature, flavor) !== "out";
}

export function packageState(model: BuildModel, name: string, flavor: Flavor): PackageFlavorState {
  const node = model.nodes.get(name);
  if (!node) return { state: "stripped", reason: "unknown package" };
  const label = flavorLabels[flavor];

  if (node.moduleId === INTERNAL_MODULE_ID) {
    return { state: "stripped", reason: "unclaimed — not mapped to any public module" };
  }

  if (node.kind === "feature") {
    const feature = model.featureById.get(node.moduleId);
    const inclusion = feature ? featureInclusion(feature, flavor) : "out";
    const ownerName = feature?.name ?? node.moduleName;
    if (inclusion === "linked") return { state: "linked", reason: null };
    if (inclusion === "partial") return { state: "partial", reason: `${ownerName} ships partially in ${label}` };
    return { state: "stripped", reason: `owning feature ${ownerName} not in ${label}` };
  }

  if (node.kind === "harness") {
    return { state: "stripped", reason: "test-only, never linked" };
  }

  // engine / platform / vendored: follow the consuming features.
  const consumers = [...(model.consumersByPackage.get(name) ?? [])]
    .map((id) => model.featureById.get(id))
    .filter((feature): feature is FeatureInput => feature !== undefined);
  const inclusions = consumers.map((feature) => featureInclusion(feature, flavor));
  if (inclusions.some((value) => value === "linked")) return { state: "linked", reason: null };
  if (inclusions.some((value) => value === "partial")) {
    return { state: "partial", reason: `only partially-included features consume ${name} in ${label}` };
  }
  return { state: "stripped", reason: `no consumer of ${name} ships in ${label}` };
}

// Row-level inclusion for the modules table. Feature rows read straight from
// their channel grid (a feature can ship while owning no packages). Infrastructure
// rows aggregate their packages: linked wins over partial wins over stripped.
export type RowInput = { kind: PackageKind; featureId: string | null; packages: string[] };

export function moduleFlavorState(model: BuildModel, row: RowInput, flavor: Flavor): PackageFlavorState {
  const label = flavorLabels[flavor];

  if (row.kind === "feature") {
    const feature = row.featureId ? model.featureById.get(row.featureId) : undefined;
    const inclusion = feature ? featureInclusion(feature, flavor) : "out";
    if (inclusion === "linked") return { state: "linked", reason: null };
    if (inclusion === "partial") return { state: "partial", reason: `Partial in ${label}` };
    return { state: "stripped", reason: `Not shipped in ${label}` };
  }

  if (row.kind === "harness") {
    return { state: "stripped", reason: "Test-only, never linked" };
  }

  const states = row.packages.map((name) => packageState(model, name, flavor).state);
  if (states.some((state) => state === "linked")) return { state: "linked", reason: null };
  if (states.some((state) => state === "partial")) {
    return { state: "partial", reason: `Partially linked in ${label}` };
  }
  return { state: "stripped", reason: `No consumer ships in ${label}` };
}

export type FlavorStates = {
  byPackage: Map<string, PackageFlavorState>;
  linked: number;
  partial: number;
  stripped: number;
  total: number;
};

export function flavorStates(model: BuildModel, flavor: Flavor): FlavorStates {
  const byPackage = new Map<string, PackageFlavorState>();
  let linked = 0;
  let partial = 0;
  let stripped = 0;
  for (const name of model.order) {
    const state = packageState(model, name, flavor);
    byPackage.set(name, state);
    if (state.state === "linked") linked += 1;
    else if (state.state === "partial") partial += 1;
    else stripped += 1;
  }
  return { byPackage, linked, partial, stripped, total: model.order.length };
}
