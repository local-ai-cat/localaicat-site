import type { Metadata } from "next";
import Link from "next/link";
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
  const mode = teamCheckoutMode(getTeamCheckoutConfig());
  return (
    <SiteShell siteMode="business">
      {mode === "unavailable" ? <TeamEnquiry /> : <TeamCheckout mode={mode} />}
    </SiteShell>
  );
}

/** An unconfigured checkout must not claim to sell a single license or seats. */
function TeamEnquiry(): React.JSX.Element {
  return (
    <section className="contentPage crewPage">
      <div className="contentHero">
        <p className="contentKicker">Team plan</p>
        <h1 className="contentTitle">A seat for everyone.</h1>
        <p className="contentIntro">Tell us how many people are joining. We&rsquo;ll help with a license for each person and a rollout that fits your team.</p>
      </div>
      <div className="teamCheckoutCard">
        <div className="teamCheckoutTop">
          <h2 className="purchasePlanName">Let&rsquo;s plan your setup</h2>
          <p className="dualCardBody">Team plans start at £40 per seat, per year, with a minimum of two seats. Volume pricing is available for larger teams.</p>
          <p className="dualCardBody">Team purchases are arranged with us here. Get in touch for a quote, invoicing or managed deployment.</p>
        </div>
        <div className="teamCheckoutBottom">
          <Link className="planButton" href="/contact">Talk about your team</Link>
        </div>
      </div>
    </section>
  );
}
