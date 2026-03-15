import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for Local AI Cat, covering on-device AI usage, paid plans, and the difference between App Store and direct-download builds."
};

export default function TermsPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="These terms describe how Local AI Cat may be used and what to expect from the app's on-device AI features, direct-download purchases, and business rollout paths."
        kicker="Terms"
        meta="Last updated: March 2026"
        title="Terms of Service"
      >
        <div className="contentGrid">
          <section className="contentCard">
            <h2>Usage</h2>
            <p>
              Local AI Cat is provided for personal and business use under the
              plan you purchase. You may not redistribute the app or reverse
              engineer protected components except where applicable law permits
              it.
            </p>
          </section>

          <section className="contentCard">
            <h2>AI output</h2>
            <p>
              AI systems can make mistakes. Do not rely on generated content for
              medical, legal, financial, safety-critical, or other high-stakes
              decisions without independent review.
            </p>
          </section>
        </div>

        <section className="contentCard">
          <h2>Plans and entitlements</h2>
          <p>
            Paid plans may grant one or more entitlements such as Pro access or
            Developer Mode. Team and Enterprise access may also depend on seat
            assignment, billing status, deployment scope, or support terms.
          </p>
        </section>

        <section className="contentCard">
          <h2>App Store versus direct download</h2>
          <p>
            The App Store and direct-download versions may differ in billing
            flows and available macOS capability sets. Direct-download and
            business builds may expose features or deployment paths that are not
            available in the sandboxed App Store build.
          </p>
        </section>

        <section className="contentCard">
          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a className="textLink" href="mailto:legal@localaicat.com">
              legal@localaicat.com
            </a>
            .
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
