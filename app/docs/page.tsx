import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import {
  displayLabel,
  distributions,
  getModules,
  moduleCatalogUpdated,
  moduleState,
  releaseChannels,
  type ModulePage
} from "../../lib/module-catalog";

export const metadata: Metadata = {
  title: "Modules",
  description: "One clear view of every public Local AI Cat module and its current shipping and testing state."
};

function ModuleChip({ children, kind }: { children: React.ReactNode; kind: string }) {
  return <span className="moduleChip" data-kind={kind}>{children}</span>;
}

function ModuleCard({ module }: { module: ModulePage }) {
  const state = moduleState(module);
  const channels = releaseChannels(module);
  const routes = distributions(module);

  return (
    <Link
      aria-label={`View ${module.name}`}
      className="moduleCard"
      data-state={state}
      href={`/docs/modules/${module.id}`}
    >
      <div className="moduleCardCopy">
        <h2>{module.name}</h2>
        <p>{module.description ?? "Details for this module are being prepared."}</p>
      </div>

      <div className="moduleChips" aria-label={`${module.name} availability and status`}>
        {(channels.length > 0 ? channels : ["No channel"]).map((channel) => (
          <ModuleChip kind="channel" key={channel}>{channel}</ModuleChip>
        ))}
        {module.platforms.map((platform) => (
          <ModuleChip kind="platform" key={platform}>{platform}</ModuleChip>
        ))}
        {(routes.length > 0 ? routes : ["Not distributed"]).map((distribution) => (
          <ModuleChip kind="distribution" key={distribution}>{distribution}</ModuleChip>
        ))}
        <ModuleChip kind="status">{displayLabel(state)}</ModuleChip>
        <ModuleChip kind="testing">Tests: {displayLabel(module.testing.tier)}</ModuleChip>
      </div>

      <span aria-hidden="true" className="moduleCardArrow">↗</span>
    </Link>
  );
}

export default function ModulesPage() {
  const modules = getModules();

  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Modules"
      intro="See what every part of Local AI Cat does, where it ships, and how thoroughly it is tested — including work in progress, locked modules, and ideas in purgatory."
      meta={`${modules.length} public modules · Snapshot updated ${moduleCatalogUpdated}`}
    >
      <div className="moduleGrid">
        {modules.map((module) => <ModuleCard key={module.id} module={module} />)}
      </div>
    </ContentPage>
  );
}
