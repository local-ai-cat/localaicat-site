import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl, getPolarAdminKey, getPolarApiBaseUrl } from "../../lib/env";
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

async function lookupLicenseKey(checkoutId: string): Promise<string | null> {
  try {
    const adminKey = getPolarAdminKey();
    if (!adminKey) return null;

    const apiBase = getPolarApiBaseUrl();

    const checkoutRes = await fetch(`${apiBase}/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${adminKey}` },
      cache: "no-store"
    });
    if (!checkoutRes.ok) return null;

    const checkout = await checkoutRes.json();
    if (checkout.status !== "confirmed" && checkout.status !== "succeeded") return null;

    const customerId: string | undefined = checkout.customer_id;
    if (!customerId) return null;

    const keysRes = await fetch(
      `${apiBase}/v1/license-keys?customer_id=${customerId}&limit=10`,
      {
        headers: { Authorization: `Bearer ${adminKey}` },
        cache: "no-store"
      }
    );
    if (!keysRes.ok) return null;

    const keysData = await keysRes.json();
    const items: Array<{ key: string; status: string }> =
      keysData.items ?? keysData.result ?? [];

    const activeKey = items.find((k) => k.status === "granted");
    return activeKey?.key ?? null;
  } catch {
    return null;
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const customerPortalUrl = getCustomerPortalUrl();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // Try direct license_key param first, then look up from checkout_id
  let licenseKey =
    firstValue(resolvedSearchParams?.license_key) ||
    firstValue(resolvedSearchParams?.licenseKey) ||
    firstValue(resolvedSearchParams?.key);

  if (!licenseKey) {
    const checkoutId = firstValue(resolvedSearchParams?.checkout_id);
    if (checkoutId) {
      licenseKey = (await lookupLicenseKey(checkoutId)) ?? undefined;
    }
  }

  const checkoutId = firstValue(resolvedSearchParams?.checkout_id);

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
