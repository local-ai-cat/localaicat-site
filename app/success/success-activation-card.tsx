"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activationLinkForToken } from "../../lib/license-activation";

type SuccessActivationCardProps = {
  checkoutId?: string | null;
  initialActivationToken?: string | null;
  initialTokenExpiresAt?: string | null;
  initialLicenseKey?: string | null;
  customerPortalUrl?: string | null;
};

type CheckoutActivationResponse = {
  license_key?: string | null;
  activation_token?: string | null;
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
  initialLicenseKey,
  customerPortalUrl
}: SuccessActivationCardProps) {
  const [licenseKey, setLicenseKey] = useState(initialLicenseKey ?? null);
  const [activationToken, setActivationToken] = useState(initialActivationToken ?? null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(initialTokenExpiresAt ?? null);
  const [tokenStatus, setTokenStatus] = useState<ActivationTokenStatus>(
    initialActivationToken ? "pending" : "waiting"
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPolling, setIsPolling] = useState(
    Boolean(checkoutId) && (!initialActivationToken || !initialLicenseKey)
  );
  const [pollError, setPollError] = useState<string | null>(null);
  const [didAttemptAutoOpen, setDidAttemptAutoOpen] = useState(Boolean(initialActivationToken));
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isLicenseRevealed, setIsLicenseRevealed] = useState(false);
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

    // Use a hidden anchor click so we trigger the OS protocol handler
    // without navigating the success page away. window.location.assign on
    // a custom-scheme URL navigates the document and tears down state.
    setDidAttemptAutoOpen(true);
    const anchor = document.createElement("a");
    anchor.href = activationLink;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const copyLicenseKey = async () => {
    if (!licenseKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Fall back to selecting the text element so the user can ⌘C.
      const node = document.getElementById("success-license-key-value");
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
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
          if (data.license_key) {
            setLicenseKey(data.license_key);
          }
          if (data.activation_token) {
            setActivationToken(data.activation_token);
            setTokenExpiresAt(data.expires_at ?? null);
            setTokenStatus("pending");
            setIsPolling(false);
            setPollError(null);
            return;
          }
          // License key is in hand but token still minting — keep polling
          // quietly; the page already displays the key for manual paste.
        } else if (!isTransient(response.status)) {
          setPollError("We couldn't prepare the activation handoff automatically yet.");
          setIsPolling(false);
          return;
        }
      } catch {
        // Network blip — fall through to retry until maxAttempts.
      }

      if (attempts >= maxAttempts) {
        setIsPolling(false);
        // Don't surface an error if we already have the license key in hand —
        // the page is fully usable via copy-paste at that point.
        if (!licenseKey) {
          setPollError("We couldn't prepare the activation handoff automatically yet.");
        }
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
      // Hidden-anchor click instead of window.location.assign so we keep the
      // success page mounted while the OS handles the protocol URL.
      const anchor = document.createElement("a");
      anchor.href = activationLink;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activationLink]);

  if (isDismissed) {
    return null;
  }

  const headlineLabel = tokenStatus === "claimed"
    ? "Activated"
    : licenseKey
      ? "License ready"
      : isPolling
        ? "Issuing license"
        : "Manual recovery";
  const headlineTone = tokenStatus === "claimed"
    ? "claimed"
    : licenseKey
      ? "ready"
      : isPolling
        ? "working"
        : "manual";

  return (
    <section className="contentCard contentCardTight successFlowCard">
      <div className="successFlowHeader">
        <div>
          <h2>Activate Local AI Cat</h2>
          <p>
            Tap <strong>Open in app</strong> below — if Local AI Cat is
            installed it’ll claim the license automatically. If for any reason
            the deeplink doesn’t fire, reveal your license key and paste it
            into Settings → Activate License.
          </p>
        </div>
        <span className={`successStateBadge successStateBadge${headlineTone[0].toUpperCase()}${headlineTone.slice(1)}`}>
          {headlineLabel}
        </span>
      </div>

      {licenseKey ? (
        <>
          <span className="successLicenseLabel">License key</span>
          <div className="commandBlockWrap">
            <pre className="commandBlock">
              <code id="success-license-key-value">
                {isLicenseRevealed ? licenseKey : "•".repeat(licenseKey.length)}
              </code>
            </pre>
            <div
              style={{
                position: "absolute",
                top: "50%",
                right: "10px",
                transform: "translateY(-50%)",
                display: "flex",
                gap: "6px"
              }}
            >
              <button
                type="button"
                className="copyButton"
                style={{ position: "static", transform: "none" }}
                onClick={() => setIsLicenseRevealed((v) => !v)}
                aria-pressed={isLicenseRevealed}
              >
                {isLicenseRevealed ? "Hide" : "Reveal"}
              </button>
              <button
                type="button"
                className="copyButton"
                style={{ position: "static", transform: "none" }}
                onClick={copyLicenseKey}
              >
                {copyState === "copied" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </>
      ) : isPolling ? (
        <p className="successLead">
          Finalizing your license now — Polar usually takes a few seconds. Keep
          this page open and your key will appear here.
        </p>
      ) : (
        <p className="successLead">
          {pollError ??
            "We couldn’t fetch your license automatically. Use the customer portal below to retrieve it, or reopen this success link."}
        </p>
      )}

      <div className="routeActions">
        {activationLink && tokenStatus !== "expired" && tokenStatus !== "invalid" ? (
          <button className="planButton" type="button" onClick={openActivationLink}>
            Open in app
          </button>
        ) : null}
        {customerPortalUrl ? (
          <a className="secondaryButton" href={customerPortalUrl}>
            Customer portal
          </a>
        ) : null}
        {!licenseKey ? (
          <a className="secondaryButton" href="/download/direct">
            Download Outdoor Cat
          </a>
        ) : null}
        <button
          className="secondaryButton secondaryButtonPlain"
          type="button"
          onClick={() => setIsDismissed(true)}
        >
          Dismiss
        </button>
      </div>

      {tokenStatus === "claimed" ? (
        <p className="successLead" style={{ marginTop: "1rem" }}>
          Local AI Cat claimed the activation. You can close this page.
        </p>
      ) : activationLink && expiryLabel ? (
        <p className="successFootnote">
          Activation handoff expires around {expiryLabel}
          {countdownLabel ? ` (${countdownLabel})` : ""}. The license key above
          stays valid — only the one-tap deep link is short-lived.
        </p>
      ) : null}

      <p className="successFootnote">
        Polar remains the source of truth for your subscription. You can always
        recover the issued key through the customer portal.
      </p>
    </section>
  );
}
