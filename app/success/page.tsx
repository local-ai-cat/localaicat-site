import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Purchase Complete",
  description:
    "Your Local AI Cat purchase is complete. Download the app and manage your billing from here."
};

export default function SuccessPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Your purchase completed. The direct-download path and billing management now continue outside the App Store flow."
        kicker="Success"
        title="You're all set"
      >
        <section className="contentCard">
          <h2>Next steps</h2>
          <ul>
            <li>Download the direct build if you are using the website billing path</li>
            <li>Keep the purchase confirmation email for billing support</li>
            <li>Use the billing portal later if you need to update payment details</li>
          </ul>
        </section>

        <section className="contentCard">
          <h2>Continue</h2>
          <p>
            Go to <Link className="textLink" href="/download">Download</Link> to
            grab the direct build, or <Link className="textLink" href="/manage">Manage</Link>{" "}
            if you need billing help later.
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}

