import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { PricingExperience } from "./pricing-experience";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Local AI Cat pricing for Indoor Cat (App Store) and Outdoor Cat (direct download). Compare plans and choose your path."
};

export default function PricingPage() {
  return (
    <SiteShell>
      <PricingExperience />
    </SiteShell>
  );
}
