"use client";

import Link from "next/link";
import { directPlans } from "../../lib/catalog";
import { getAppStoreUrl, getDirectDownloadUrl } from "../../lib/env";
import { trackSiteAction } from "../../lib/site-analytics";
import { useSiteMode } from "./site-mode";

/** The same offers and purchase destinations on the homepage and pricing pages. */
export function PersonalPlans() {
  const [mode] = useSiteMode();
  const developerPlan = directPlans.find(plan => plan.name === "Developer Mode")!;
  return (
    <>
      <div className="homePlanGrid purchasePlans subscriptionPlans">
        <article className="homePlanCard homePlanCardFree">
          <h3 className="purchasePlanName">Free</h3>
          <p className="homePlanPrice">£0<span className="homePlanCadence">forever</span></p>
          <p className="dualCardBody">Chat, transcription and local models. No account, no trial clock.</p>
          <div className="planButtonPair">
            <a className="secondaryButton purchasePlanButton" href={getDirectDownloadUrl()} onClick={() => trackSiteAction("download_clicked", "mac")}>Mac download</a>
            <a className="secondaryButton purchasePlanButton" href={getAppStoreUrl()} onClick={() => trackSiteAction("download_clicked", "app_store")}>App Store</a>
          </div>
        </article>
        {directPlans.filter(plan => plan.name !== "Developer Mode").map(plan => {
          const annual = plan.name === "Pro Annual";
          return (
            <article className={`homePlanCard${annual ? " homePlanCardBest" : ""}`} key={plan.name}>
              <h3 className="purchasePlanName">{plan.name}</h3>
              <p className="homePlanPrice">{plan.price}<span className="homePlanCadence">{plan.cadence}</span></p>
              <p className="dualCardBody">{plan.note}</p>
              <ul className="planBenefits"><li>Curated Pro models</li><li>Developer Mode while subscribed</li><li>Early access to new features</li></ul>
              {annual && <span className="planSaving">Save £8 a year</span>}
              <a className={`planButton purchasePlanButton${annual ? " planButtonAccent" : ""}`} href={plan.ctaHref}>{plan.ctaLabel}</a>
            </article>
          );
        })}
      </div>
      <article className="developerUnlock">
        <div>
          <p className="unlockEyebrow">Optional · one-time unlock</p>
          <h3 className="purchasePlanName">Developer Mode</h3>
          <p>Explore compatible community models from Hugging Face. Pay once to keep Developer Mode without a Pro subscription.</p>
          <p className="unlockClarification">Already on Pro? Developer Mode is included while your subscription is active.</p>
        </div>
        <div className="unlockAction">
          <p className="homePlanPrice">£10<span className="homePlanCadence">once</span></p>
          <a className="secondaryButton" href={developerPlan.ctaHref}>Unlock Developer Mode</a>
          <span>No subscription. No renewals.</span>
        </div>
      </article>
      <p className="purchaseNote">Paid plans use Polar checkout. Activate your license key in the app. Monthly and annual plans renew until cancelled.</p>
      <div className="crewInvite">
        <div>
          <h3>{mode === "space" ? "Want to bring your crew?" : "Bringing your team?"}</h3>
          <p>A seat for everyone, or a rollout made for your organisation.</p>
        </div>
        <Link className="secondaryButton" href="/teams">Teams &amp; enterprise</Link>
      </div>
    </>
  );
}
