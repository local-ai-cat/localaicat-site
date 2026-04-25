"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activationLinkForToken } from "../../lib/license-activation";

type SuccessActivationCardProps = {
  checkoutId?: string | null;
  initialActivationToken?: string | null;
  customerPortalUrl?: string | null;
};

type CheckoutActivationResponse = {
  activation_token?: string;
  expires_at?: string | null;
};

export function SuccessActivationCard({
  checkoutId,
  initialActivationToken,
  customerPortalUrl
}: SuccessActivationCardProps) {
  const [activationToken, setActivationToken] = useState(initialActivationToken ?? null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(Boolean(checkoutId) && !initialActivationToken);
  const [pollError, setPollError] = useState<string | null>(null);
  const [didAttemptAutoOpen, setDidAttemptAutoOpen] = useState(Boolean(initialActivationToken));
  const didAttemptOpenRef = useRef(false);

  const activationLink = useMemo(
    () => (activationToken ? activationLinkForToken(activationToken) : null),
    [activationToken]
  );
  const statusTone = activationToken ? "ready" : isPolling ? "working" : "manual";
  const statusLabel = activationToken
    ? "Ready to activate"
    : isPolling
      ? "Preparing activation"
      : "Manual fallback";
  const expiryLabel = tokenExpiresAt
    ? new Date(tokenExpiresAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
    : null;

  useEffect(() => {
    if (!checkoutId || activationToken) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

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
          const data = (await response.json()) as CheckoutActivationResponse;
          if (data.activation_token) {
            setActivationToken(data.activation_token);
            setTokenExpiresAt(data.expires_at ?? null);
            setIsPolling(false);
            setPollError(null);
            return;
          }
        }

        if (response.status !== 404 && response.status !== 422) {
          setPollError("We couldn't prepare the activation handoff automatically yet.");
          setIsPolling(false);
          return;
        }
      } catch {
        if (!cancelled) {
          setPollError("We couldn't prepare the activation handoff automatically yet.");
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
  }, [checkoutId, activationToken]);

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

  return (
    <section className="contentCard contentCardTight successFlowCard">
      <div className="successFlowHeader">
        <div>
          <h2>Open Outdoor Cat</h2>
          <p>
            We confirm your checkout, mint a short-lived activation token, then
            hand it into the app without exposing the raw Polar license key here.
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
            activationToken
              ? "successStatusItemComplete"
              : isPolling
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
          }`}
        >
          <strong>Activation token ready</strong>
          <p>
            {activationToken
              ? "Your one-time activation token is ready for Outdoor Cat."
              : "We’re waiting for Polar to issue the license and mint the activation token now."}
          </p>
        </div>
        <div
          className={`successStatusItem ${
            activationToken
              ? didAttemptAutoOpen
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
              : "successStatusItemWaiting"
          }`}
        >
          <strong>Open app and activate</strong>
          <p>
            {activationToken
              ? "We try to open Local AI Cat automatically. If the browser blocks it, use the activation button below."
              : "Once the token is ready, we’ll try the native activation link automatically."}
          </p>
        </div>
      </div>

      {activationLink ? (
        <>
          <p className="successLead">
            Your activation handoff is ready. If Outdoor Cat is already open,
            switch back to it after the browser prompt. If nothing happens, use
            the activation button below.
          </p>

          {expiryLabel ? (
            <p className="successKeyMeta">
              This activation handoff expires around <span>{expiryLabel}</span> and can only be used once.
            </p>
          ) : null}

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
            Finalizing your activation token now. Keep this page open for a few
            more seconds and we’ll try to hand off to the app automatically.
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
              "We couldn’t complete the automatic app handoff yet, but the purchase is still recoverable from your customer portal."}
          </p>
          <ol className="contentOrderedList">
            <li>Open the customer portal and reveal the issued license key.</li>
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
        We keep the browser handoff token short-lived and single-use. Polar
        remains the source of truth, and you can always recover the issued key
        through the customer portal if the automatic handoff is interrupted.
      </p>
    </section>
  );
}
