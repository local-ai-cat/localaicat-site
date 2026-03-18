import type { Metadata } from "next";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getAppStoreUrl } from "../../../lib/env";
import { appStorePlans } from "../../../lib/catalog";

export const metadata: Metadata = {
  title: "App Store Pricing",
  description:
    "Local AI Cat App Store pricing with Apple billing. View plans for iPhone, iPad, and Mac."
};

export default function AppStorePricingPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="App Store pricing is the same core catalog, with billing and purchase management handled by Apple."
        kicker="Pricing"
        title="App Store pricing"
      >
        <section className="contentCard contentCardTight">
          <h2>Apple handles billing</h2>
          <p>The App Store is the simplest route for Apple billing and install flow.</p>
          <div className="routeActions">
            <a className="planButton" href={getAppStoreUrl()}>
              Open App Store listing
            </a>
          </div>
        </section>

        <section className="pricingBand pricingBandInline">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Catalog</p>
            <h2>App Store plans.</h2>
          </div>

          <div className="planGrid planGridDirect">
            {appStorePlans.map((plan, index) => (
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
              </article>
            ))}
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
