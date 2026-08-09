import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { PackagesTable, type PackageRow } from "../_components/packages-table";
import packagesData from "../../../data/packages.json";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Every Swift package in Local AI Cat — its owning module, derived testing evidence and lock, modular state, and dependency edges.",
};

export default function PackagesPage() {
  const rows = packagesData.packages as PackageRow[];
  return (
    <ContentPage
      kicker="Inside Local AI Cat"
      title="Packages"
      intro="The flat engineering view beneath the modules grid: every Swift package, who owns it, its repository-derived test evidence and deterministic lock, and what it depends on (and what depends on it). Test counts are evidence, not a quality grade."
      meta={`${rows.length} packages · Snapshot updated ${packagesData.updated ?? "—"}`}
    >
      <p className="docsSubnav">
        <Link href="/docs">← Modules</Link>
      </p>
      <PackagesTable rows={rows} />
    </ContentPage>
  );
}
