import Link from "next/link";
import { businessPlans } from "../../lib/catalog";

export function TeamPlans() {
  return (
    <div className="bizPlanGrid">
      {businessPlans.map(plan => (
        <article className={`homePlanCard bizPlanCard${plan.name === "Team" ? " homePlanCardBest" : ""}`} key={plan.name}>
          <h3 className="purchasePlanName">{plan.name}</h3>
          <p className="homePlanPrice">{plan.price}<span className="homePlanCadence">{plan.cadence}</span></p>
          <p className="dualCardBody">{plan.note}</p>
          <ul className="dualCardList">{plan.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>
          <Link className="planButton bizPlanButton" href={plan.ctaHref}>{plan.ctaLabel}</Link>
        </article>
      ))}
    </div>
  );
}
