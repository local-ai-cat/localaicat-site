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
import { ModulesTable } from "./_components/modules-table";

export const metadata: Metadata = {
  title: "Modules",
  description: "One clear view of every public Local AI Cat module and its current shipping and testing state."
};

export default function ModulesPage() {
  const modules = getModules();
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
      usesPackages: module.usesPackages
    };
  });

  // Infrastructure modules (engines / platform / harness / vendored) round out
  // the 67-package picture. They render as non-clickable rows — no per-module
  // page exists for them yet — with feature-only columns shown as n/a.
  const infrastructureRows: ModuleTableRow[] = getInfrastructureModules().map((module) => ({
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
    usesPackages: []
  }));

  const rows = [...featureRows, ...infrastructureRows];

  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Modules"
      intro="See what every part of Local AI Cat does, where it ships, and how thoroughly it is tested — including work in progress, locked modules, and ideas in purgatory."
      meta={`${featureRows.length} features · ${infrastructureRows.length} infrastructure modules · Snapshot updated ${moduleCatalogUpdated}`}
      callout={
        <p className="moduleBuildsLink">
          Want to see what gets compiled into each build?{" "}
          <Link href="/docs/builds">Build anatomy →</Link>
        </p>
      }
    >
      <ModulesTable rows={rows} />
    </ContentPage>
  );
}
