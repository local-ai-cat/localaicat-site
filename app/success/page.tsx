import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { DownloadExperience } from "../_components/download-experience";
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
  // reveal cookie can be bound to the verified buyer's browser. Rendering
  // the key into the server HTML would also bake it into proxy/browser
  // caches, which we want to avoid.
  const customerPortalUrl = getCustomerPortalUrl();
  // Polar always returns buyers here with a checkout id; without one this is a bookmark or a typed address.
  const fromCheckout = Boolean(checkoutId);

  return (
    <SiteShell>
      <ContentPage
        intro={fromCheckout
          ? "Your purchase completed. Download the app if needed, then copy your license key into Settings → Activate License."
          : "Your license key is always in the customer portal. Copy it into Settings → Activate License in the app."}
        kicker={fromCheckout ? "Success" : "License"}
        title={fromCheckout ? "You're all set" : "Find your license key"}
      >
        {fromCheckout && (
          <SuccessActivationCard
            checkoutId={checkoutId}
            customerPortalUrl={customerPortalUrl}
          />
        )}

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
