import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getCustomerPortalUrl, getPolarAdminKey, getPolarApiBaseUrl } from "../../lib/env";

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

function activationLinkFor(licenseKey: string) {
  const params = new URLSearchParams({ license_key: licenseKey });
  return `localaichat://activate-license?${params.toString()}`;
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

  const activationLink = licenseKey ? activationLinkFor(licenseKey) : null;

  return (
    <SiteShell>
      <ContentPage
        intro="Your purchase completed. Download the app if needed, then activate the issued license key in Settings."
        kicker="Success"
        title="You're all set"
      >
        <section className="contentCard">
          <h2>Next steps</h2>
          {activationLink ? (
            <>
              <p>
                Your license key is ready. Click the button below on the same
                Mac where the app is installed to activate instantly.
              </p>
              <div className="routeActions">
                <a className="planButton" href={activationLink}>
                  Open app and activate
                </a>
              </div>
              <p>
                You can also find your license key in the customer portal or
                purchase confirmation email for manual activation on other
                devices.
              </p>
            </>
          ) : (
            <ol className="contentOrderedList">
              <li>
                Find your license key in the customer portal or purchase
                confirmation email.
              </li>
              <li>
                Open the app and go to Settings, then choose Activate License.
              </li>
              <li>
                Paste the key to unlock Pro or Developer Mode on this device.
              </li>
              <li>
                Keep the confirmation email for billing support and future
                device setup.
              </li>
            </ol>
          )}
          <p>
            If you later use Indoor Cat on the same Apple account, paste the
            same license key there too. Any entitlement sync is treated as a
            convenience, not the primary activation path.
          </p>
        </section>

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
