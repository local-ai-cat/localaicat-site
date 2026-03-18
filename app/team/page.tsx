import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { TeamCheckout } from "./team-checkout";

export const metadata: Metadata = {
  title: "Team Plan",
  description:
    "Get Local AI Cat for your team. Seat-based pricing with volume discounts."
};

export default function TeamPage() {
  return (
    <SiteShell siteMode="business">
      <TeamCheckout />
    </SiteShell>
  );
}
