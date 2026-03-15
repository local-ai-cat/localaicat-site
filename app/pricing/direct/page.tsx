import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { businessPlans, directPlans } from "../../../lib/catalog";

export const metadata: Metadata = {
  title: "Direct Pricing",
  description:
    "Pricing for the Local AI Cat direct-download build, including Pro, Developer Mode, Team, and Enterprise plans."
};

export default function DirectPricingPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Direct pricing covers the full Mac path, plus the route for Team and Enterprise."
        kicker="Pricing"
        title="Direct pricing"
      >
        <section className="contentCard contentCardTight">
          <h2>Base app is free</h2>
          <p>
            Both the direct build and the App Store build keep the base experience free. Paid plans unlock early access and additional features.
          </p>
        </section>

        <section className="pricingBand pricingBandInline">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Personal</p>
            <h2>Direct plans.</h2>
          </div>

          <div className="planGrid planGridDirect">
            {directPlans.map((plan, index) => (
              <article
                className={`planCard ${index === 1 ? "planCardStrong" : ""}`}
                key={plan.name}
              >
                <div className="planHeader">
                  <h3>{plan.name}</h3>
                  <p>{plan.note}</p>
                </div>
                <p className="planPrice">
                  <span>{plan.price}</span> {plan.cadence}
                </p>
                <ul>
                  {plan.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <Link className="planButton" href={plan.ctaHref}>
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="pricingBand pricingBandInline">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Business</p>
            <h2>Team and Enterprise.</h2>
          </div>

          <div className="planGrid planGridBusiness">
            {businessPlans.map((plan, index) => (
              <article
                className={`planCard ${index === 0 ? "planCardStrong" : ""}`}
                key={plan.name}
              >
                <div className="planHeader">
                  <h3>{plan.name}</h3>
                  <p>{plan.note}</p>
                </div>
                <p className="planPrice">
                  <span>{plan.price}</span> {plan.cadence}
                </p>
                <ul>
                  {plan.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <Link className="planButton" href={plan.ctaHref}>
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
