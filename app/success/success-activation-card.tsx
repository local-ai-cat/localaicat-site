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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [didAttemptAutoOpen, setDidAttemptAutoOpen] = useState(Boolean(initialLicenseKey));
  const didAttemptOpenRef = useRef(false);

  const activationLink = useMemo(
    () => (licenseKey ? activationLinkFor(licenseKey) : null),
    [licenseKey]
  );
  const statusTone = licenseKey ? "ready" : isPolling ? "working" : "manual";
  const statusLabel = licenseKey
    ? "Ready to activate"
    : isPolling
      ? "Preparing activation"
      : "Manual fallback";
  const keyPreview = licenseKey
    ? `${licenseKey.slice(0, 10)}...${licenseKey.slice(-6)}`
    : null;

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
    setDidAttemptAutoOpen(true);
    const timeout = window.setTimeout(() => {
      window.location.assign(activationLink);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activationLink]);

  async function copyLicenseKey() {
    if (!licenseKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  return (
    <section className="contentCard contentCardTight successFlowCard">
      <div className="successFlowHeader">
        <div>
          <h2>Open Outdoor Cat</h2>
          <p>
            We confirm your checkout, fetch the issued license key, then pass it
            into the app through a secure activation link.
          </p>
        </div>
        <span className={`successStateBadge successStateBadge${statusTone[0].toUpperCase()}${statusTone.slice(1)}`}>
          {statusLabel}
        </span>
      </div>

      <div className="successStatusList">
        <div className="successStatusItem successStatusItemComplete">
          <strong>Checkout confirmed</strong>
          <p>Polar sent us back to this success page with your completed checkout.</p>
        </div>
        <div
          className={`successStatusItem ${
            licenseKey
              ? "successStatusItemComplete"
              : isPolling
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
          }`}
        >
          <strong>License key ready</strong>
          <p>
            {licenseKey
              ? "Your key has been issued and is ready to hand into the app."
              : "We’re checking Polar for the granted license key now."}
          </p>
        </div>
        <div
          className={`successStatusItem ${
            licenseKey
              ? didAttemptAutoOpen
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
              : "successStatusItemWaiting"
          }`}
        >
          <strong>Open app and activate</strong>
          <p>
            {licenseKey
              ? "We try to open Local AI Cat automatically. If the browser blocks it, use the button below."
              : "Once the key is ready, we’ll try the native activation link automatically."}
          </p>
        </div>
      </div>

      {activationLink ? (
        <>
          <p className="successLead">
            Your license key is ready. If Outdoor Cat is already open, switch
            back to it after the browser prompt. If nothing happens, use the
            activation button.
          </p>

          {licenseKey ? (
            <div className="commandBlockWrap successKeyWrap">
              <pre className="commandBlock successKeyBlock">{licenseKey}</pre>
              <button className="copyButton" onClick={copyLicenseKey} type="button">
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Retry"
                    : "Copy key"}
              </button>
            </div>
          ) : null}

          <p className="successKeyMeta">
            Manual fallback key: <span>{keyPreview}</span>
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
        </>
      ) : isPolling ? (
        <>
          <p className="successLead">
            Finalizing your license key now. Keep this page open for a few more
            seconds and we’ll try to hand off to the app automatically.
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
          <p className="successLead">
            {pollError ??
              "We couldn’t confirm the license key automatically yet, but the purchase should still be recoverable from your billing portal."}
          </p>
          <ol className="contentOrderedList">
            <li>Open the customer portal and copy the issued license key.</li>
            <li>Open Outdoor Cat and go to Settings, then choose Activate License.</li>
            <li>Paste the key to unlock Pro or Developer Mode on this device.</li>
            <li>Keep the confirmation email for billing support and future device setup.</li>
          </ol>
          <div className="routeActions">
            {customerPortalUrl ? (
              <a className="planButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : null}
            <a className="secondaryButton" href="/download/direct">
              Download Outdoor Cat
            </a>
          </div>
        </>
      )}

      <p className="successFootnote">
        If you later use Indoor Cat on the same Apple account, the same license
        key still works there. Any cross-device sync is convenience only, not
        the primary activation path.
      </p>
    </section>
  );
}
