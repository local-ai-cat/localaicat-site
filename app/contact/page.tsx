import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch for Enterprise rollout with invoicing, MDM deployment, and custom packaging, or general support."
};

export default function ContactPage() {
  return (
    <SiteShell siteMode="business">
      <ContentPage
        intro="For Team seat-based checkout, use the self-serve Team page. For everything else, reach out below."
        kicker="Contact"
        title="Get in touch"
      >
        <div className="dualCards" style={{ maxWidth: 720 }}>
          <article className="dualCard dualCardStrong">
            <p className="dualCardEyebrow">Enterprise</p>
            <h3>Sales-led path.</h3>
            <p className="dualCardBody">
              For invoicing, procurement, .pkg packaging, MDM rollout, or
              security review requirements.
            </p>
            <ul className="dualCardList">
              <li>Invoice and procurement workflow</li>
              <li>Managed deployment and packaging</li>
              <li>Custom onboarding and support</li>
            </ul>
            <div className="dualCardActions">
              <a
                className="planButton"
                href="mailto:serious@localaicat.com"
              >
                serious@localaicat.com
              </a>
            </div>
          </article>

          <article className="dualCard">
            <p className="dualCardEyebrow">Support</p>
            <h3>General help.</h3>
            <p className="dualCardBody">
              Billing questions, technical issues, or help choosing between App
              Store and direct download.
            </p>
            <ul className="dualCardList">
              <li>Billing and license key help</li>
              <li>Technical support</li>
              <li>Build comparison guidance</li>
            </ul>
            <div className="dualCardActions">
              <a
                className="planButton"
                href="mailto:support@localaicat.com"
              >
                support@localaicat.com
              </a>
              <Link className="secondaryButton" href="/support">
                FAQ
              </Link>
            </div>
          </article>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
