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
    "Your Local AI Cat purchase is complete. Open the app, finish activation, and manage your billing from here.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const activationToken =
    firstValue(resolvedSearchParams?.t) ||
    firstValue(resolvedSearchParams?.token) ||
    firstValue(resolvedSearchParams?.activation_token) ||
    checkoutState?.activationToken ||
    undefined;

  return (
    <SiteShell>
      <ContentPage
        intro="Your purchase completed. Download the app if needed, then hand the activation token into Outdoor Cat to claim the issued license."
        kicker="Success"
        title="You're all set"
      >
        <SuccessActivationCard
          checkoutId={checkoutId}
          initialActivationToken={activationToken}
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
