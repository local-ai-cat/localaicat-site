import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { PricingExperience } from "./pricing-experience";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with Local AI Cat. Buy Pro Monthly, Pro Annual or the one-time Developer Mode upgrade for Mac."
};

export default function PricingPage() {
  return (
    <SiteShell>
      <PricingExperience />
    </SiteShell>
  );
}
