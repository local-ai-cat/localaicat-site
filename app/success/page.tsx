import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl } from "../../lib/env";
import { resolveCheckoutSuccessState } from "../../lib/polar-checkout";
import { SuccessActivationCard } from "./success-activation-card";

export const metadata: Metadata = {
  title: "Purchase Complete",
  description:
    "Your Local AI Cat purchase is complete. Activate your license key and manage your billing from here."
};

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const checkoutId = firstValue(resolvedSearchParams?.checkout_id);
  const checkoutState = checkoutId
    ? await resolveCheckoutSuccessState(checkoutId)
    : null;
  const customerPortalUrl =
    checkoutState?.customerPortalUrl ?? getCustomerPortalUrl();

  // Try direct license_key param first, then look up from checkout_id
  let licenseKey =
    firstValue(resolvedSearchParams?.license_key) ||
    firstValue(resolvedSearchParams?.licenseKey) ||
    firstValue(resolvedSearchParams?.key);

  if (!licenseKey) {
    licenseKey = checkoutState?.licenseKey ?? undefined;
  }

  return (
    <SiteShell>
      <ContentPage
        intro="Your purchase completed. Download the app if needed, then activate the issued license key in Settings."
        kicker="Success"
        title="You're all set"
      >
        <SuccessActivationCard
          checkoutId={checkoutId}
          initialLicenseKey={licenseKey}
          customerPortalUrl={customerPortalUrl}
        />

        <section className="contentCard">
          <h2>Continue</h2>
          <div className="routeActions">
            <Link className="planButton" href="/download/direct">
              Download direct build
            </Link>
            <Link className="secondaryButton" href="/pricing/direct">
              Compare direct plans
            </Link>
            {customerPortalUrl ? (
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : (
              <Link className="secondaryButton" href="/manage">
                Billing portal help
              </Link>
            )}
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
