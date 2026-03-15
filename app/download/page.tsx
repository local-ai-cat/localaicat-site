import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Choose your install path for Local AI Cat: App Store for simple Apple billing or direct download for the full Mac experience."
};

export default function DownloadPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Choose your install path first, then continue to download and pricing."
        kicker="Download"
        title="Choose a path"
      >
        <div className="routeGrid">
          <section className="routeCard routeCardStrong">
            <p className="routeEyebrow">Direct download</p>
            <h3>Full Mac path.</h3>
            <p>Direct billing, full macOS features, then pricing on the next page.</p>
            <Link className="planButton" href="/download/direct">
              Continue to direct download
            </Link>
          </section>

          <section className="routeCard">
            <p className="routeEyebrow">App Store</p>
            <h3>Simple install.</h3>
            <p>Apple billing, full iPhone and iPad support, then pricing on the next page.</p>
            <Link className="planButton" href="/download/app-store">
              Continue to App Store
            </Link>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
