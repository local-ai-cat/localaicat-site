import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Purchase Cancelled",
  description:
    "Your purchase was not completed. Return to pricing or choose a different install path for Local AI Cat."
};

export default function CancelPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="No charge was completed. You can head back to pricing, use the App Store instead, or contact us if you need a Team or Enterprise path."
        kicker="Checkout"
        title="Purchase not completed"
      >
        <section className="contentCard">
          <h2>Try a different route</h2>
          <ul>
            <li>Use the App Store if you want Apple billing</li>
            <li>Return to direct pricing when you are ready</li>
            <li>Use Team or Enterprise if this is really a business rollout</li>
          </ul>
          <p>
            Head back to <Link className="textLink" href="/#download-paths">pricing</Link>,{" "}
            <Link className="textLink" href="/download">download options</Link>, or{" "}
            <Link className="textLink" href="/contact">contact</Link>.
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
