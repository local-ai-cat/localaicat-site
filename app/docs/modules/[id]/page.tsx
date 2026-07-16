import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "../../../_components/content-page";
import {
  displayLabel,
  distributions,
  getModule,
  getModules,
  moduleState,
  releaseChannels,
  type Availability,
  type ModulePage
} from "../../../../lib/module-catalog";
import { ModuleMedia } from "./module-media";

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getModules().map((module) => ({ id: module.id }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { id } = await params;
  const module = getModule(id);
  if (!module) return { title: "Module not found" };
  return {
    title: module.name,
    description: module.description ?? `Shipping and testing details for ${module.name}.`
  };
}

function StatusChip({ children, kind }: { children: React.ReactNode; kind: string }) {
  return <span className="moduleChip moduleDetailChip" data-kind={kind}>{children}</span>;
}

function availabilityPlatforms(module: ModulePage, key: ModulePage["channels"][number]["key"]) {
  const channel = module.channels.find((candidate) => candidate.key === key);
  if (!channel) return [];

  return (["iOS", "macOS"] as const).flatMap((platform) => {
    const availability: Availability = channel[platform];
    if (availability === "no") return [];
    const qualifier = availability === "yes" ? "" : ` (${availability})`;
    return [`${platform}${qualifier}`];
  });
}

function StatusSection({ module }: { module: ModulePage }) {
  const state = moduleState(module);
  const channels = releaseChannels(module);
  const routes = distributions(module);

  return (
    <section className="moduleSection moduleStatus" data-state={state}>
      <div className="moduleSectionHeading">
        <p>Status</p>
        <h2>Where it stands</h2>
      </div>

      <div className="moduleStatusSummary">
        <StatusChip kind="status">Lane: {displayLabel(module.lane)}</StatusChip>
        <StatusChip kind="status">Status: {displayLabel(module.status)}</StatusChip>
        <StatusChip kind="testing">
          Testing: {displayLabel(module.testing.tier)} (~{module.testing.cases} cases)
        </StatusChip>
        {module.accessTier === "pro" ? <StatusChip kind="access">Pro</StatusChip> : null}
      </div>

      <dl className="moduleStatusGrid">
        <div>
          <dt>Platforms</dt>
          <dd>{module.platforms.length > 0 ? module.platforms.join(" · ") : "Not currently shipping"}</dd>
        </div>
        <div>
          <dt>Release channels</dt>
          <dd>{channels.length > 0 ? channels.join(" · ") : "None"}</dd>
        </div>
        <div>
          <dt>Distribution</dt>
          <dd>{routes.length > 0 ? routes.join(" · ") : "Not currently distributed"}</dd>
        </div>
      </dl>

      <ul className="moduleShippingList" aria-label="Availability by channel">
        {module.channels.map((channel) => {
          const platforms = availabilityPlatforms(module, channel.key);
          if (platforms.length === 0) return null;
          const label = channel.key === "main" ? "Indoor · App Store" :
            channel.key === "outdoor" ? "Outdoor · Direct download" : channel.label;
          return (
            <li key={channel.key}>
              <strong>{label}</strong>
              <span>{platforms.join(" · ")}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getModule(id);
  if (!module) notFound();

  const backlog = module.overlay.backlog ?? [];
  const history = module.overlay.history ?? [];

  return (
    <div className="moduleDetail">
      <Link className="contentBack" href="/docs">← All modules</Link>
      <ContentPage
        kicker="Local AI Cat module"
        title={module.name}
        intro="Current shipping, testing, and product context for this part of Local AI Cat."
      >
        <StatusSection module={module} />

        <section className="moduleSection">
          <div className="moduleSectionHeading">
            <p>Description</p>
            <h2>What it does</h2>
          </div>
          <p className="moduleLongCopy">
            {module.description ?? "A full description for this module is being prepared."}
          </p>
        </section>

        <section className="moduleSection">
          <div className="moduleSectionHeading">
            <p>Media</p>
            <h2>See it in action</h2>
          </div>
          <ModuleMedia id={module.id} name={module.name} caption={module.overlay.mediaCaption} />
        </section>

        <section className="moduleSection">
          <div className="moduleSectionHeading">
            <p>Backlog / improvements</p>
            <h2>What comes next</h2>
          </div>
          {backlog.length > 0 ? (
            <ul className="moduleEntryList">
              {backlog.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  {item.description ? <p>{item.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="moduleEmptyState">No improvements are listed for this module yet.</p>
          )}
        </section>

        <section className="moduleSection">
          <div className="moduleSectionHeading">
            <p>History</p>
            <h2>How it got here</h2>
          </div>
          {history.length > 0 ? (
            <ol className="moduleHistory">
              {history.map((entry) => (
                <li key={`${entry.date}-${entry.title}`}>
                  <time dateTime={entry.date}>{entry.date}</time>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="moduleEmptyState">No change history has been published for this module yet.</p>
          )}
        </section>
      </ContentPage>
    </div>
  );
}
