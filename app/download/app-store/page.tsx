import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getAppStoreUrl } from "../../../lib/env";

export const metadata: Metadata = {
  title: "App Store Download",
  description:
    "Download the Local AI Cat Indoor Cat build from the App Store for iPhone, iPad, and Mac with Apple billing."
};

export default function AppStoreDownloadPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="Indoor Cat is the App Store route. Apple handles billing, updates, and purchase restore."
        kicker="Indoor Cat"
        title="App Store for iPhone, iPad, and Mac"
      >
        <section className="contentCard contentCardTight">
          <h2>Get the app</h2>
          <p>
            Indoor Cat is available for iPhone, iPad, and Mac. Upgrade to Pro
            or Developer Mode inside the app through Apple billing, or redeem
            an existing website license key from Settings.
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
              The Mac App Store build runs sandboxed, so some desktop features
              like window management for other apps are only in{" "}
              <Link className="textLink" href="/download/direct">
                Outdoor Cat
              </Link>
              .
            </li>
            <li>
              Need the full macOS desktop feature set? Try the{" "}
              <Link className="textLink" href="/download/direct">
                Outdoor Cat
              </Link>{" "}
              direct-download build.
            </li>
            <li>
              App Store subscription cancellation and refund requests go
              through Apple, not the website billing portal.
            </li>
          </ul>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
