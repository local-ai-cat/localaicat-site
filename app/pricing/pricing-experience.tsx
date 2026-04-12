"use client";

import Link from "next/link";
import { useState } from "react";
import { DragToggle } from "../_components/drag-toggle";
import { appStorePlans, businessPlans, directPlans } from "../../lib/catalog";
import { getAppStoreUrl } from "../../lib/env";

type Path = "indoor" | "outdoor";

function getInitialPath(): Path {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("pricing-path");
    if (stored === "indoor" || stored === "outdoor") return stored;
  }
  return "outdoor";
}

export function PricingExperience() {
  const [path, setPath] = useState<Path>(getInitialPath);

  const handleChange = (v: Path) => {
    setPath(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("pricing-path", v);
    }
  };

  return (
    <section className="contentPage">
      <div className="contentHero">
        <p className="contentKicker">
          {path === "indoor" ? "Indoor Cat" : "Outdoor Cat"}
        </p>
        <h1 className="contentTitle">Pricing</h1>
        <p className="contentIntro">
          {path === "indoor"
            ? "Apple handles billing, cancellation, and refunds. Same catalog, App Store flow."
            : "Web billing through Polar. Full Mac feature set, no sandbox."}
        </p>
      </div>

      <div className="toggleCardSection" style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <DragToggle
          labels={["Indoor Cat", "Outdoor Cat"]}
          onChange={handleChange}
          options={["indoor", "outdoor"] as const}
          size="compact"
          value={path}
        />
      </div>

      <div className="contentStack">
        {path === "outdoor" ? (
          <>
            <section className="contentCard contentCardTight">
              <h2>Base app is free</h2>
              <p>
                Install first, then buy only if you want paid features. Outdoor
                Cat purchases unlock in-app through a Polar license key.
              </p>
            </section>

            <section className="pricingBand pricingBandInline">
              <div className="sectionHeading">
                <p className="sectionEyebrow">Personal</p>
                <h2>Outdoor Cat plans.</h2>
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
          </>
        ) : (
          <>
            <section className="contentCard contentCardTight">
              <h2>Apple handles billing</h2>
              <p>
                Indoor Cat is the simplest route for Apple billing and install
                flow across iPhone, iPad, and Mac. Apple also handles
                cancellation, billing support, and refund requests.
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
          </>
        )}
      </div>
    </section>
  );
}
