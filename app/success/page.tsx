import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { DownloadExperience } from "../download/download-experience";
import {
  getAppStoreUrl,
  getCustomerPortalUrl,
  getDirectDownloadFilename,
  getDirectDownloadSha256,
  getDirectDownloadUrl,
  getDirectDownloadVersion,
  getDirectInstallScriptCommand,
  getHomebrewInstallCommand
} from "../../lib/env";
import { activationTokenExpiresAt } from "../../lib/activation-tokens";
import { resolveCheckoutSuccessState } from "../../lib/polar-checkout";
import { SuccessActivationCard } from "./success-activation-card";

const DEFAULT_BREW_CMD = "brew install --cask local-ai-cat";

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
  const activationTokenExpiry = activationToken
    ? activationTokenExpiresAt(activationToken)?.toISOString() ?? checkoutState?.activationTokenExpiresAt ?? null
    : checkoutState?.activationTokenExpiresAt ?? null;

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
          initialTokenExpiresAt={activationTokenExpiry}
          initialLicenseKey={checkoutState?.licenseKey ?? null}
          customerPortalUrl={customerPortalUrl}
        />

        <DownloadExperience
          appStoreUrl={getAppStoreUrl()}
          downloadUrl={getDirectDownloadUrl()}
          filename={getDirectDownloadFilename()}
          homebrewCmd={getHomebrewInstallCommand() || DEFAULT_BREW_CMD}
          scriptCmd={getDirectInstallScriptCommand()}
          sha256={getDirectDownloadSha256()}
          version={getDirectDownloadVersion()}
        />

        <section className="contentCard">
          <h2>Manage</h2>
          <div className="routeActions">
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
