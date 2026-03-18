import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getAppStoreUrl } from "../../../lib/env";

export const metadata: Metadata = {
  title: "App Store Download",
  description:
    "Download Local AI Cat from the App Store for iPhone, iPad, and Mac with Apple billing."
};

export default function AppStoreDownloadPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="The simplest install path. Apple handles billing, updates, and family sharing."
        kicker="App Store"
        title="Apple path"
      >
        <section className="contentCard contentCardTight">
          <h2>Get the app</h2>
          <p>
            Available for iPhone, iPad, and Mac. Upgrade to Pro or Developer
            Mode inside the app through Apple billing.
          </p>
          <div className="routeActions">
            <a className="planButton" href={getAppStoreUrl()}>
              Open App Store
            </a>
            <Link className="secondaryButton" href="/pricing/app-store">
              See pricing
            </Link>
          </div>
        </section>

        <section className="contentCard">
          <h2>Good to know</h2>
          <ul>
            <li>
              The Mac App Store build runs sandboxed — some macOS features like
              window management for other apps are only in the{" "}
              <Link className="textLink" href="/download/direct">
                direct build
              </Link>
              .
            </li>
            <li>
              Team and Enterprise plans use the direct-download path with web
              billing.
            </li>
          </ul>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
