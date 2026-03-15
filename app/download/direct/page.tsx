import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getDirectDownloadUrl } from "../../../lib/env";

export const metadata: Metadata = {
  title: "Direct Download",
  description:
    "Download the Local AI Cat direct build for macOS with full features, Paddle billing, and the path for Team and Enterprise rollout."
};

export default function DirectDownloadPage() {
  const directDownloadUrl = getDirectDownloadUrl();

  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="This is the full Mac path. Download the app first, then continue to pricing."
        kicker="Direct Download"
        title="Direct path"
      >
        <section className="contentCard contentCardTight">
          <h2>Download first</h2>
          <p>
            {directDownloadUrl
              ? "Use the direct build for the fuller macOS feature set."
              : "Add the direct download URL in Railway and this button will go live."}
          </p>
          <div className="routeActions">
            {directDownloadUrl ? (
              <a className="planButton" href={directDownloadUrl}>
                Download direct build
              </a>
            ) : (
              <span className="secondaryButton secondaryButtonStatic">Direct build coming soon</span>
            )}
            <Link className="secondaryButton" href="/pricing/direct">
              See direct pricing
            </Link>
          </div>
        </section>

        <div className="contentGrid contentGridDual">
          <section className="contentCard">
            <h2>Why go direct</h2>
            <p>Full macOS features, direct billing, and the path Team and Enterprise build on.</p>
          </section>

          <section className="contentCard">
            <h2>Business lives here too</h2>
            <p>Team seats, invoicing, packaging, and rollout support all start on the direct path.</p>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
