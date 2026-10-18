import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { getTeamCheckoutConfig } from "../../lib/env";
import { teamCheckoutMode } from "../../lib/team-checkout";
import { TeamCheckout } from "./team-checkout";

export const metadata: Metadata = {
  title: "Team Plan",
  description:
    "Get Local AI Cat for your team. Seat-based pricing with volume discounts."
};

// The mode comes from server env, which differs per deployment.
export const dynamic = "force-dynamic";

export default function TeamPage() {
  return (
    <SiteShell siteMode="business">
      <TeamCheckout mode={teamCheckoutMode(getTeamCheckoutConfig())} />
    </SiteShell>
  );
}
