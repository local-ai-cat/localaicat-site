import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { activationTokenExpiresAt } from "../../lib/activation-tokens";
import { getCustomerPortalUrl } from "../../lib/env";
import { SuccessActivationCard } from "../success/success-activation-card";

export const metadata: Metadata = {
  title: "Open Outdoor Cat",
  description:
    "Open Outdoor Cat to finish activation with a short-lived Local AI Cat handoff token.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActivatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activationToken =
    firstValue(resolvedSearchParams?.t) ||
    firstValue(resolvedSearchParams?.token) ||
    firstValue(resolvedSearchParams?.activation_token) ||
    undefined;
  const activationTokenExpiry = activationToken
    ? activationTokenExpiresAt(activationToken)?.toISOString() ?? null
    : null;
  const customerPortalUrl = getCustomerPortalUrl();

  return (
    <SiteShell>
      <ContentPage
        intro="If Outdoor Cat is installed, this link can open the app and claim the activation token. If the browser stays here, use the activation button below."
        kicker="Activation"
        title="Open Outdoor Cat"
      >
        <SuccessActivationCard
          initialActivationToken={activationToken}
          initialTokenExpiresAt={activationTokenExpiry}
          customerPortalUrl={customerPortalUrl}
        />

        <section className="contentCard">
          <h2>Need the app?</h2>
          <p>
            Install the latest Outdoor Cat build first, then come back to this
            activation link or use the customer portal to recover your license.
          </p>
          <div className="routeActions">
            <Link className="planButton" href="/download/direct">
              Download Outdoor Cat
            </Link>
            <Link className="secondaryButton" href="/support">
              Get support
            </Link>
            {customerPortalUrl ? (
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : null}
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
