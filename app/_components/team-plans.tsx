"use client";

import Link from "next/link";
import { businessPlans } from "../../lib/catalog";
import { useSiteMode } from "./site-mode";

export function TeamPlans() {
  const [mode] = useSiteMode();
  return (
    <>
      <div className="bizPlanGrid">
        {businessPlans.map(plan => (
          <article className={`homePlanCard bizPlanCard${plan.name === "Team" ? " homePlanCardBest" : ""}`} key={plan.name}>
            <h3 className="purchasePlanName">{plan.name}</h3>
            <p className="homePlanPrice">{plan.price}<span className="homePlanCadence">{plan.cadence}</span></p>
            <p className="dualCardBody">{plan.note}</p>
            <ul className="dualCardList">{plan.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>
            <Link className="planButton bizPlanButton" href={`${plan.ctaHref}?mode=${mode}`}>{plan.ctaLabel}</Link>
          </article>
        ))}
      </div>
      <div className="enterpriseBand">
        <div className="enterpriseBandText">
          <h3>Your tools. Your rollout.</h3>
          <p>For enterprise, choose the capabilities included in your build. We can help with managed deployment, procurement and invoicing.</p>
        </div>
        <Link className="secondaryButton" href={`/contact?mode=${mode}`}>Talk to us</Link>
      </div>
    </>
  );
}
