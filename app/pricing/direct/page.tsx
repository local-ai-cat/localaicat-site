import type { Metadata } from "next";
import { SiteShell } from "../../_components/site-shell";
import { PricingExperience } from "../pricing-experience";

export const metadata: Metadata = {
  title: "Mac pricing",
  description: "Free core. Pro from £4 a month or £40 a year. Developer Mode is a £10 one-time purchase."
};

export default async function DirectPricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  return <SiteShell><PricingExperience checkoutUnavailable={params.checkout === "unavailable"} /></SiteShell>;
}
