import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Contact - Team & Enterprise",
  description:
    "Get in touch for Team seat-based billing or Enterprise rollout with invoicing, MDM deployment, and custom packaging."
};

export default function ContactPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Use Team for small direct-download rollouts. Use Enterprise when packaging, invoicing, procurement, or deployment support become part of the deal."
        kicker="Contact"
        title="Team and Enterprise"
      >
        <div className="contentGrid">
          <section className="contentCard" id="team">
            <h2>Team</h2>
            <p>
              Team is the seat-based path for small groups that want the
              direct-download build, shared billing, and a cleaner upgrade path
              than the App Store.
            </p>
            <ul>
              <li>Seat-based billing</li>
              <li>Same core Pro entitlement</li>
              <li>Direct-download deployment</li>
            </ul>
            <p>
              Email{" "}
              <a className="textLink" href="mailto:team@localaicat.com">
                team@localaicat.com
              </a>{" "}
              and include your expected seat count.
            </p>
          </section>

          <section className="contentCard" id="enterprise">
            <h2>Enterprise</h2>
            <p>
              Enterprise is for invoicing, procurement, MDM rollouts, custom
              packaging, support expectations, or security review overhead.
            </p>
            <ul>
              <li>Invoice and procurement workflow</li>
              <li>.pkg and managed deployment path</li>
              <li>Support and rollout planning</li>
            </ul>
            <p>
              Email{" "}
              <a className="textLink" href="mailto:enterprise@localaicat.com">
                enterprise@localaicat.com
              </a>{" "}
              with your deployment requirements and timeline.
            </p>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}

