"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activationLinkForToken } from "../../lib/license-activation";

type SuccessActivationCardProps = {
  checkoutId?: string | null;
  initialActivationToken?: string | null;
  initialTokenExpiresAt?: string | null;
  customerPortalUrl?: string | null;
};

type CheckoutActivationResponse = {
  activation_token?: string;
  expires_at?: string | null;
};

type ActivationTokenStatusResponse =
  | {
      status: "pending";
      expires_at?: string | null;
    }
  | {
      status: "claimed" | "expired" | "invalid";
    }
  | {
      error: string;
      code: string;
    };

type ActivationTokenStatus = "waiting" | "pending" | "claimed" | "expired" | "invalid";

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function SuccessActivationCard({
  checkoutId,
  initialActivationToken,
  initialTokenExpiresAt,
  customerPortalUrl
}: SuccessActivationCardProps) {
  const [activationToken, setActivationToken] = useState(initialActivationToken ?? null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(initialTokenExpiresAt ?? null);
  const [tokenStatus, setTokenStatus] = useState<ActivationTokenStatus>(
    initialActivationToken ? "pending" : "waiting"
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPolling, setIsPolling] = useState(Boolean(checkoutId) && !initialActivationToken);
  const [pollError, setPollError] = useState<string | null>(null);
  const [didAttemptAutoOpen, setDidAttemptAutoOpen] = useState(Boolean(initialActivationToken));
  const didAttemptOpenRef = useRef(false);

  const activationLink = useMemo(
    () => (activationToken ? activationLinkForToken(activationToken) : null),
    [activationToken]
  );
  const statusTone =
    tokenStatus === "claimed"
      ? "claimed"
      : tokenStatus === "expired" || tokenStatus === "invalid"
        ? "manual"
        : activationToken
          ? "ready"
          : isPolling
            ? "working"
            : "manual";
  const statusLabel =
    tokenStatus === "claimed"
      ? "Claimed"
      : tokenStatus === "expired"
        ? "Expired"
        : tokenStatus === "invalid"
          ? "Manual fallback"
          : activationToken
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
  const countdownLabel = remainingSeconds === null ? null : formatRemainingTime(remainingSeconds);

  const openActivationLink = () => {
    if (!activationLink) {
      return;
    }

    setDidAttemptAutoOpen(true);
    window.location.assign(activationLink);
  };

  useEffect(() => {
    if (!checkoutId || activationToken) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    // Retry on transient states. The race we're handling: Polar redirects to
    // /success the moment checkout is confirmed, but the webhook → license →
    // activation-token chain takes a few seconds to land. The API returns:
    //   404 — license not yet issued
    //   422 — checkout/customer not yet confirmed
    //   503 — license exists but activation token not yet minted (or config)
    //   5xx — transient infra
    // Treat all of those as "keep waiting" until maxAttempts. Only give up on
    // a 4xx that indicates a permanent client-side problem (bad checkout id).
    const isTransient = (status: number) =>
      status === 404 || status === 422 || status === 503 || status >= 500;

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
            setTokenStatus("pending");
            setIsPolling(false);
            setPollError(null);
            return;
          }
        } else if (!isTransient(response.status)) {
          setPollError("We couldn't prepare the activation handoff automatically yet.");
          setIsPolling(false);
          return;
        }
      } catch {
        // Network blip — fall through to retry until maxAttempts.
      }

      if (attempts >= maxAttempts) {
        setPollError("We couldn't prepare the activation handoff automatically yet.");
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
    if (!activationToken || isDismissed) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;
    let dismissTimeoutId: number | undefined;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/activation/status?t=${encodeURIComponent(activationToken)}`, {
          cache: "no-store"
        });

        if (cancelled) {
          return;
        }

        const data = (await response.json()) as ActivationTokenStatusResponse;
        if ("status" in data) {
          switch (data.status) {
          case "pending":
            setTokenStatus("pending");
            if (data.expires_at) {
              setTokenExpiresAt(data.expires_at);
            }
            return;
          case "claimed":
            setTokenStatus("claimed");
            dismissTimeoutId = window.setTimeout(() => {
              if (!cancelled) {
                setIsDismissed(true);
              }
            }, 1800);
            if (intervalId) {
              window.clearInterval(intervalId);
            }
            return;
          case "expired":
          case "invalid":
            setTokenStatus(data.status);
            if (intervalId) {
              window.clearInterval(intervalId);
            }
            return;
          }
        }
      } catch {
        // Keep the page usable if a transient status poll fails.
      }
    };

    void checkStatus();
    intervalId = window.setInterval(checkStatus, 2000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (dismissTimeoutId) {
        window.clearTimeout(dismissTimeoutId);
      }
    };
  }, [activationToken, isDismissed]);

  useEffect(() => {
    if (!tokenExpiresAt || tokenStatus === "claimed") {
      setRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(tokenExpiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && tokenStatus === "pending") {
        setTokenStatus("expired");
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [tokenExpiresAt, tokenStatus]);

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

  if (isDismissed) {
    return null;
  }

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
            tokenStatus === "claimed" || activationToken
              ? "successStatusItemComplete"
              : isPolling
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
          }`}
        >
          <strong>Activation token ready</strong>
          <p>
            {activationToken
              ? "Your short-lived, one-time activation token is ready for Outdoor Cat."
              : "We’re waiting for Polar to issue the license and mint the activation token now."}
          </p>
        </div>
        <div
          className={`successStatusItem ${
            tokenStatus === "claimed"
              ? "successStatusItemComplete"
              : activationToken
              ? didAttemptAutoOpen
                ? "successStatusItemWorking"
                : "successStatusItemWaiting"
              : "successStatusItemWaiting"
          }`}
        >
          <strong>Open app and activate</strong>
          <p>
            {tokenStatus === "claimed"
              ? "Outdoor Cat claimed the activation token. This browser handoff will close itself."
              : activationToken
              ? "We try to open Local AI Cat automatically. If the browser blocks it, use the activation button below."
              : "Once the token is ready, we’ll try the native activation link automatically."}
          </p>
        </div>
      </div>

      {tokenStatus === "claimed" ? (
        <>
          <div className="successClaimedPanel">
            <strong>Activation claimed in Outdoor Cat.</strong>
            <p>You can close this page, or continue to the customer portal if you need billing details.</p>
          </div>
          <div className="routeActions">
            <button className="secondaryButton secondaryButtonPlain" type="button" onClick={() => setIsDismissed(true)}>
              Dismiss
            </button>
            {customerPortalUrl ? (
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : null}
          </div>
        </>
      ) : activationLink && tokenStatus !== "expired" && tokenStatus !== "invalid" ? (
        <>
          <p className="successLead">
            Your activation handoff is ready. If Outdoor Cat is already open,
            switch back to it after the browser prompt. If nothing happens, use
            the activation button below.
          </p>

          {expiryLabel ? (
            <div className="successCountdown">
              <span>One-time token</span>
              <strong>{countdownLabel ?? "Ready"}</strong>
              <p>Expires around {expiryLabel}. If it expires, reopen this success link or use the customer portal.</p>
            </div>
          ) : null}

          <div className="routeActions">
            <button className="planButton planButtonPlain" type="button" onClick={openActivationLink}>
              Open app and activate
            </button>
            {customerPortalUrl ? (
              <a className="secondaryButton" href={customerPortalUrl}>
                Open customer portal
              </a>
            ) : null}
            <button className="secondaryButton secondaryButtonPlain" type="button" onClick={() => setIsDismissed(true)}>
              Dismiss
            </button>
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
            {tokenStatus === "expired"
              ? "That activation handoff expired before Outdoor Cat claimed it. Your purchase is still recoverable from the customer portal."
              : pollError ??
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
