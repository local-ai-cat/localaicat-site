"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activationLinkFor } from "../../lib/license-activation";

type SuccessActivationCardProps = {
  checkoutId?: string | null;
  initialLicenseKey?: string | null;
  customerPortalUrl?: string | null;
};

export function SuccessActivationCard({
  checkoutId,
  initialLicenseKey,
  customerPortalUrl
}: SuccessActivationCardProps) {
  const [licenseKey, setLicenseKey] = useState(initialLicenseKey ?? null);
  const [isPolling, setIsPolling] = useState(Boolean(checkoutId) && !initialLicenseKey);
  const [pollError, setPollError] = useState<string | null>(null);
  const didAttemptOpenRef = useRef(false);

  const activationLink = useMemo(
    () => (licenseKey ? activationLinkFor(licenseKey) : null),
    [licenseKey]
  );

  useEffect(() => {
    if (!checkoutId || licenseKey) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const lookup = async () => {
      attempts += 1;

      try {
        const response = await fetch(`/api/checkout/${checkoutId}`, {
          cache: "no-store"
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          const data = (await response.json()) as { license_key?: string };
          if (data.license_key) {
            setLicenseKey(data.license_key);
            setIsPolling(false);
            setPollError(null);
            return;
          }
        }

        if (response.status !== 404 && response.status !== 422) {
          setPollError("We couldn't confirm your license key automatically yet.");
          setIsPolling(false);
          return;
        }
      } catch {
        if (!cancelled) {
          setPollError("We couldn't confirm your license key automatically yet.");
          setIsPolling(false);
        }
        return;
      }

      if (attempts >= maxAttempts) {
        setIsPolling(false);
        return;
      }

      window.setTimeout(lookup, 2000);
    };

    void lookup();

    return () => {
      cancelled = true;
    };
  }, [checkoutId, licenseKey]);

  useEffect(() => {
    if (!activationLink || didAttemptOpenRef.current) {
      return;
    }

    didAttemptOpenRef.current = true;
    const timeout = window.setTimeout(() => {
      window.location.assign(activationLink);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activationLink]);

  return (
    <section className="contentCard">
      <h2>Next steps</h2>
      {activationLink ? (
        <>
          <p>
            Your license key is ready. We&apos;re trying to open the app on this
            Mac now. If nothing happens, use the button below.
          </p>
          <div className="routeActions">
            <a className="planButton" href={activationLink}>
              Open app and activate
            </a>
            {customerPortalUrl ? (
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : null}
          </div>
          <p>
            You can also find your license key in the customer portal or
            purchase confirmation email for manual activation on other devices.
          </p>
        </>
      ) : isPolling ? (
        <>
          <p>
            Finalizing your license key now. This can take a few seconds right
            after checkout.
          </p>
          <p>
            Keep this page open. We&apos;ll try to open the app automatically as
            soon as the key is available.
          </p>
          {customerPortalUrl ? (
            <div className="routeActions">
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {pollError ? <p>{pollError}</p> : null}
          {customerPortalUrl ? (
            <p>
              Billing is ready in the customer portal now. If the license key is
              still taking a moment to appear, open the portal below and copy it
              from there.
            </p>
          ) : null}
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
              Keep the confirmation email for billing support and future device
              setup.
            </li>
          </ol>
          {customerPortalUrl ? (
            <div className="routeActions">
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            </div>
          ) : null}
        </>
      )}
      <p>
        If you later use Indoor Cat on the same Apple account, paste the same
        license key there too. Any entitlement sync is treated as a convenience,
        not the primary activation path.
      </p>
    </section>
  );
}
