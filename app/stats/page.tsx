import type { Metadata } from "next";
import { StatsView } from "./stats-view";
import { cachedStatsReport } from "../../lib/site-stats-report";
import { parseRange } from "../../lib/stats-range";

// Public, and only ever totals: no address, browser or visitor is stored, so none can be shown.
export const dynamic = "force-dynamic";
// The App Store backfill runs after the response; give it room to finish.
export const maxDuration = 60;
export const metadata: Metadata = {
  title: "Stats",
  description: "How Local AI Cat is doing: downloads from the App Store and the site, visits, Macs and orders, as totals.",
  // Open to anyone with the link, but not something to land on from search; not in the sitemap either.
  robots: { index: false, follow: false }
};

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  const range = parseRange((await searchParams).range);
  return <StatsView report={await cachedStatsReport(range)} range={range} />;
}
