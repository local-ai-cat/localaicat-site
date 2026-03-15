import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Window Management",
  description:
    "macOS window management features in Local AI Cat, including keyboard shortcuts and side-by-side layouts available in the direct-download build."
};

export default function WindowManagementPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Local AI Cat includes keyboard shortcuts and macOS window behavior that fit best in the direct-download build."
        kicker="macOS Feature"
        title="Window Management"
        callout={
          <p>
            <strong>Mac App Store note:</strong> the App Store build can only
            move the Local AI Cat window itself. It cannot control other apps'
            windows because App Store sandboxing blocks that access.
          </p>
        }
      >
        <section className="contentCard">
          <h2>What the direct-download build is for</h2>
          <ul>
            <li>Snap Local AI Cat into useful side-by-side layouts</li>
            <li>Use the fuller Mac capability set outside App Store sandbox limits</li>
            <li>Keep the direct-download path aligned with Team and Enterprise rollout</li>
          </ul>
        </section>

        <div className="contentGrid">
          <section className="contentCard">
            <h2>Why the App Store is more limited</h2>
            <p>
              Apple requires Mac App Store apps to run inside a sandbox. That
              limits external window control and other system-level capabilities
              that fit better in a direct-download build.
            </p>
          </section>

          <section className="contentCard">
            <h2>Need help choosing the right build?</h2>
            <p>
              If you are comparing App Store, direct download, Team, or
              Enterprise rollout, email{" "}
              <a className="textLink" href="mailto:support@localaicat.com">
                support@localaicat.com
              </a>
              .
            </p>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
