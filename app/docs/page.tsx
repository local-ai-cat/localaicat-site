import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import {
  distributions,
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
  const rows: ModuleTableRow[] = modules.map((module) => {
    const channels = releaseChannels(module).map((channel) => channel.toLowerCase());
    const routes = distributions(module).map((route) => route.toLowerCase());
    return {
      id: module.id,
      name: module.name,
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
      apiParity: module.api?.parity ?? "notApplicable"
    };
  });

  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Modules"
      intro="See what every part of Local AI Cat does, where it ships, and how thoroughly it is tested — including work in progress, locked modules, and ideas in purgatory."
      meta={`${modules.length} public modules · Snapshot updated ${moduleCatalogUpdated}`}
    >
      <ModulesTable rows={rows} />
    </ContentPage>
  );
}
