import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import { getAppStoreUrl } from "../../../lib/env";

export const metadata: Metadata = {
  title: "App Store Download",
  description:
    "Download Local AI Cat from the App Store for iPhone, iPad, and Mac with Apple billing and the easiest install flow."
};

export default function AppStoreDownloadPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="This is the simple Apple path. Open the App Store first, then continue to pricing."
        kicker="App Store"
        title="Apple path"
      >
        <section className="contentCard contentCardTight">
          <h2>Open the App Store</h2>
          <p>Use the App Store for Apple billing and the easiest install flow.</p>
          <div className="routeActions">
            <a className="planButton" href={getAppStoreUrl()}>
              Open App Store listing
            </a>
            <Link className="secondaryButton" href="/pricing/app-store">
              See App Store pricing
            </Link>
          </div>
        </section>

        <div className="storeGrid">
          <section className="storeCard">
            <h3>iPhone and iPad</h3>
            <p>Full iOS and iPadOS experience through the App Store.</p>
          </section>

          <section className="storeCard">
            <h3>Mac App Store</h3>
            <p>Simpler route on macOS, with the current window-management limitation.</p>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
