import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl } from "../../lib/env";

export const metadata: Metadata = {
  title: "Manage Billing",
  description:
    "Manage your Local AI Cat subscription, payment methods, invoices, and license keys through the customer portal."
};

export default function ManagePage() {
  const portalUrl = getCustomerPortalUrl();

  return (
    <SiteShell>
      <ContentPage
        intro="Manage your subscription, payment methods, invoices, and license keys — all handled by Polar."
        kicker="Manage"
        title="Billing"
      >
        <section className="contentCard contentCardTight">
          <h2>Customer portal</h2>
          <p>
            Access your portal using the email you purchased with. From there
            you can update payment methods, manage subscriptions, download
            invoices, and view your license keys.
          </p>
          {portalUrl && (
            <div className="routeActions">
              <a className="planButton" href={portalUrl}>
                Open portal
              </a>
            </div>
          )}
        </section>

        <section className="contentCard">
          <h2>License keys</h2>
          <p>
            After purchasing on the web, you receive a license key. Paste it
            into the app under Settings to activate Pro or Developer Mode. If
            you use iCloud, access can sync across your Apple devices
            automatically.
          </p>
        </section>

        <section className="contentCard">
          <h2>Need help?</h2>
          <p>
            Email{" "}
            <a className="textLink" href="mailto:support@localaicat.com">
              support@localaicat.com
            </a>{" "}
            for billing questions, or visit the{" "}
            <Link className="textLink" href="/support">
              support page
            </Link>{" "}
            for general help.
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
