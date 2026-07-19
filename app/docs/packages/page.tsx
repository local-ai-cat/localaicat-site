import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { PackagesTable, type PackageRow } from "../_components/packages-table";
import packagesData from "../../../data/packages.json";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Every Swift package in Local AI Cat — its owning module, test coverage, modular state, and dependency edges.",
};

export default function PackagesPage() {
  const rows = packagesData.packages as PackageRow[];
  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Packages"
      intro="The flat engineering view beneath the modules grid: every Swift package, who owns it, how well it is tested on its own, and what it depends on (and what depends on it). There are more packages than modules because a single module can own several."
      meta={`${rows.length} packages · Snapshot updated ${packagesData.updated ?? "—"}`}
    >
      <p className="docsSubnav">
        <Link href="/docs">← Modules</Link>
      </p>
      <PackagesTable rows={rows} />
    </ContentPage>
  );
}
