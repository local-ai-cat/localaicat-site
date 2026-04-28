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
  // The license key is fetched client-side from /api/checkout/[id] so the
  // reveal cookie can be bound to the original visitor's browser. Rendering
  // the key into the server HTML would also bake it into proxy/browser
  // caches, which we want to avoid.
  const customerPortalUrl = getCustomerPortalUrl();

  return (
    <SiteShell>
      <ContentPage
        intro="Your purchase completed. Download the app if needed, then hand the activation token into Outdoor Cat to claim the issued license."
        kicker="Success"
        title="You're all set"
      >
        <SuccessActivationCard
          checkoutId={checkoutId}
          initialActivationToken={undefined}
          initialTokenExpiresAt={null}
          initialLicenseKey={null}
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
