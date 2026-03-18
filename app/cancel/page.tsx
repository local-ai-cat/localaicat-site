import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Purchase Cancelled",
  description:
    "Your purchase was not completed. Return to pricing or choose a different path."
};

export default function CancelPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="No charge was made. You can try again or choose a different path."
        kicker="Checkout"
        title="Not completed"
      >
        <section className="contentCard">
          <h2>Continue</h2>
          <div className="routeActions">
            <Link className="planButton" href="/pricing/direct">
              Direct pricing
            </Link>
            <Link className="secondaryButton" href="/download/app-store">
              Try App Store instead
            </Link>
            <Link className="secondaryButton" href="/contact">
              Contact us
            </Link>
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
