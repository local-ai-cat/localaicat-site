import type { Metadata } from "next";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getAppStoreUrl } from "../../../lib/env";
import { appStorePlans } from "../../../lib/catalog";

export const metadata: Metadata = {
  title: "App Store Pricing",
  description:
    "Local AI Cat Indoor Cat App Store pricing with Apple billing. View plans for iPhone, iPad, and Mac."
};

export default function AppStorePricingPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="Indoor Cat pricing uses the same core catalog, with billing and purchase management handled by Apple."
        kicker="Indoor Cat"
        title="App Store pricing"
      >
        <section className="contentCard contentCardTight">
          <h2>Apple handles billing</h2>
          <p>
            Indoor Cat is the simplest route for Apple billing and install flow
            across iPhone, iPad, and Mac. Apple also handles cancellation,
            billing support, and refund requests for App Store purchases.
          </p>
          <div className="routeActions">
            <a className="planButton" href={getAppStoreUrl()}>
              Open App Store listing
            </a>
          </div>
        </section>

        <section className="contentCard contentCardTight">
          <h2>Already bought on the web?</h2>
          <p>
            If you already unlocked Outdoor Cat on the site, Indoor Cat can
            redeem the same license key in Settings. Apple billing is only
            required if you want to buy inside the App Store build itself.
          </p>
        </section>

        <section className="pricingBand pricingBandInline">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Catalog</p>
            <h2>Indoor Cat plans.</h2>
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
