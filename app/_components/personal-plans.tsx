"use client";

import Link from "next/link";
import { directPlans } from "../../lib/catalog";
import { getDirectDownloadUrl } from "../../lib/env";
import { trackSiteAction } from "../../lib/site-analytics";
import { useSiteMode } from "./site-mode";

/** The same offers and purchase destinations on the homepage and pricing pages. */
export function PersonalPlans() {
  const [mode] = useSiteMode();
  return (
    <>
      <div className="homePlanGrid purchasePlans">
        <article className="homePlanCard">
          <h3 className="purchasePlanName">Free</h3>
          <p className="homePlanPrice">£0<span className="homePlanCadence">forever</span></p>
          <p className="dualCardBody">Chat, transcription and local models. No account, no trial clock.</p>
          <a className="secondaryButton purchasePlanButton" href={getDirectDownloadUrl()} onClick={() => trackSiteAction("download_clicked", "mac")}>Download free</a>
        </article>
        {directPlans.map(plan => {
          const annual = plan.name === "Pro Annual";
          return (
            <article className={`homePlanCard${annual ? " homePlanCardBest" : ""}`} key={plan.name}>
              <h3 className="purchasePlanName">{plan.name}</h3>
              <p className="homePlanPrice">{plan.price}<span className="homePlanCadence">{plan.cadence}</span></p>
              <p className="dualCardBody">{plan.note}</p>
              {annual && <span className="planSaving">Save £8 a year</span>}
              {plan.name === "Developer Mode" && <span className="planSaving planSavingQuiet">Works with Free or Pro</span>}
              <a className={`planButton purchasePlanButton${annual ? " planButtonAccent" : ""}`} href={plan.ctaHref}>{plan.ctaLabel}</a>
            </article>
          );
        })}
      </div>
      <p className="purchaseNote">Paid plans use Polar checkout. Activate your license key in the app. Monthly and annual plans renew until cancelled.</p>
      <div className="crewInvite">
        <div>
          <h3>{mode === "space" ? "Want to bring your crew?" : "Bringing your team?"}</h3>
          <p>A seat for everyone, or a rollout made for your organisation.</p>
        </div>
        <Link className="secondaryButton" href={`/teams?mode=${mode}`}>Teams &amp; enterprise</Link>
      </div>
    </>
  );
}
