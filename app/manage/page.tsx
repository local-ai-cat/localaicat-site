import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl } from "../../lib/env";

export const metadata: Metadata = {
  title: "Manage Billing",
  description:
    "Manage your Local AI Cat subscription, update payment methods, view invoices, and handle billing through the Paddle customer portal."
};

export default function ManagePage() {
  const customerPortalUrl = getCustomerPortalUrl();

  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Billing management should stay simple. Paddle handles subscription changes, payment methods, invoices, and billing history so the site does not need its own full account portal."
        kicker="Manage"
        title="Manage billing"
        callout={
          <p>
            Paddle&apos;s customer portal uses email-based access, so users can
            manage billing without a separate Local AI Cat account.
          </p>
        }
      >
        <section className="contentCard">
          <h2>What users will manage here</h2>
          <ul>
            <li>Update payment methods</li>
            <li>Cancel or change subscriptions</li>
            <li>View invoices and billing history</li>
            <li>Handle the commerce side without a custom site portal</li>
          </ul>
        </section>

        <div className="contentGrid">
          <section className="contentCard">
            <h2>Open the Paddle portal</h2>
            {customerPortalUrl ? (
              <p>
                <a className="textLink" href={customerPortalUrl}>
                  Open billing management
                </a>
              </p>
            ) : (
              <p>
                Add <code>PADDLE_CUSTOMER_PORTAL_URL</code> in Railway once the
                Paddle customer portal URL is available from your dashboard.
              </p>
            )}
          </section>

          <section className="contentCard">
            <h2>Need help instead?</h2>
            <p>
              Email{" "}
              <a className="textLink" href="mailto:support@localaicat.com">
                support@localaicat.com
              </a>{" "}
              if you need help choosing between App Store, direct billing, Team,
              or Enterprise.
            </p>
          </section>
        </div>
      </ContentPage>
    </SiteShell>
  );
}

