import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import {
  distributions,
  getInfrastructureModules,
  getModules,
  moduleCatalogUpdated,
  moduleState,
  releaseChannels
} from "../../lib/module-catalog";
import type { ModuleTableRow } from "../../lib/module-table";
import {
  buildModel,
  flavorOrder,
  moduleFlavorState,
  type FeatureInput,
  type Flavor,
  type GraphInput,
  type InfraModuleInput,
  type RowInput
} from "../../lib/build-anatomy";
import graphData from "../../data/module-graph.json";
import { ModulesTable } from "./_components/modules-table";

export const metadata: Metadata = {
  title: "Modules",
  description: "One clear view of every public Local AI Cat module and its current shipping and testing state."
};

type GateList = Record<string, Array<{ file: string; line: number }>>;

export default function ModulesPage() {
  const modules = getModules();
  const infrastructureModules = getInfrastructureModules();

  // Build the derived package graph so every row can carry its per-flavor
  // inclusion state and its App Store gate markers.
  const featureInputs: FeatureInput[] = modules.map((module) => ({
    id: module.id,
    name: module.name,
    ownedPackages: module.ownedPackages,
    usesPackages: module.usesPackages,
    channels: module.channels
  }));
  const infraInputs: InfraModuleInput[] = infrastructureModules;
  const graph = graphData as GraphInput;
  const model = buildModel(featureInputs, infraInputs, graph);

  const gatesByPackage = new Map<string, Array<{ file: string; line: number }>>();
  for (const pkg of graph.packages) {
    if (pkg.appStoreGates.length > 0) gatesByPackage.set(pkg.name, pkg.appStoreGates);
  }
  function gatesFor(names: string[]): GateList {
    const out: GateList = {};
    for (const name of names) {
      const gates = gatesByPackage.get(name);
      if (gates) out[name] = gates;
    }
    return out;
  }
  function flavorStatesFor(input: RowInput): ModuleTableRow["flavorStates"] {
    const out = {} as ModuleTableRow["flavorStates"];
    for (const flavor of flavorOrder as Flavor[]) out[flavor] = moduleFlavorState(model, input, flavor);
    return out;
  }

  const featureRows: ModuleTableRow[] = modules.map((module) => {
    const channels = releaseChannels(module).map((channel) => channel.toLowerCase());
    const routes = distributions(module).map((route) => route.toLowerCase());
    return {
      id: module.id,
      name: module.name,
      kind: "feature",
      clickable: true,
      description: module.description ?? "Details for this module are being prepared.",
      channels: channels.length > 0 ? channels : ["none"],
      platforms: module.platforms,
      distributions: routes.length > 0 ? routes : ["none"],
      status: moduleState(module),
      modular: module.modular,
      testingStatus: module.behavioral.status,
      testingCases: module.testing.cases,
      hasSnapshot: module.behavioral.hasSnapshot,
      neverDriven: module.behavioral.neverDriven,
      logging: module.testing.logging.grade,
      loggingSignal: module.testing.logging.signal,
      apiParity: module.api?.parity ?? "notApplicable",
      ownedPackages: module.ownedPackages,
      usesPackages: module.usesPackages,
      packageGates: gatesFor(module.ownedPackages),
      flavorStates: flavorStatesFor({ kind: "feature", featureId: module.id, packages: module.ownedPackages })
    };
  });

  // Infrastructure modules (engines / platform / harness / vendored) round out
  // the 68-package picture. They render as non-clickable rows — no per-module
  // page exists for them yet — with feature-only columns shown as n/a.
  const infrastructureRows: ModuleTableRow[] = infrastructureModules.map((module) => ({
    id: module.id,
    name: module.name,
    kind: module.kind,
    clickable: false,
    description: module.description,
    channels: [],
    platforms: [],
    distributions: [],
    status: "n/a",
    modular: "no",
    testingStatus: "untested",
    testingCases: 0,
    hasSnapshot: false,
    neverDriven: false,
    logging: "",
    loggingSignal: "",
    apiParity: "notApplicable",
    ownedPackages: module.packages,
    usesPackages: [],
    packageGates: gatesFor(module.packages),
    flavorStates: flavorStatesFor({ kind: module.kind, featureId: null, packages: module.packages })
  }));

  const rows = [...featureRows, ...infrastructureRows];

  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Modules"
      intro="See what every part of Local AI Cat does, where it ships, and how thoroughly it is tested — including work in progress, locked modules, and ideas in purgatory. Pick a build to see what is compiled into each flavor."
      meta={`${featureRows.length} features · ${infrastructureRows.length} infrastructure modules · Snapshot updated ${moduleCatalogUpdated}`}
    >
      <p className="docsSubnav">
        <Link href="/docs/packages">Packages view →</Link>
      </p>
      <ModulesTable rows={rows} />
    </ContentPage>
  );
}
