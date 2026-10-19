import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl } from "../../lib/env";
import { MANUAL_ACTIVATION_MESSAGE } from "../../lib/license-activation";

export const metadata: Metadata = {
  title: "Activate Local AI Cat",
  description: "Copy your license key from the customer portal and activate Local AI Cat in Settings.",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ActivatePage() {
  const customerPortalUrl = getCustomerPortalUrl();
  return (
    <SiteShell>
      <ContentPage intro={MANUAL_ACTIVATION_MESSAGE} kicker="Activation" title="Your license belongs with your cat">
        <section className="contentCard">
          <h2>Activate in Settings</h2>
          <p>Automatic activation links have been retired. Sign into the customer portal with the email you used at checkout, copy your license key, then paste it into the app.</p>
          <div className="routeActions">
            {customerPortalUrl ? <a className="planButton" href={customerPortalUrl}>Get your license key</a> : <Link className="planButton" href="/manage">Billing portal help</Link>}
            <Link className="secondaryButton" href="/#download">Download Outdoor Cat</Link>
            <Link className="secondaryButton" href="/support">Get support</Link>
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
