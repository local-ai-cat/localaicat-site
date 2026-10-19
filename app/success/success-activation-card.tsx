"use client";

import { useEffect, useState } from "react";

type SuccessActivationCardProps = {
  checkoutId?: string | null;
  customerPortalUrl?: string | null;
};
type CheckoutActivationResponse = {
  license_key?: string | null;
  reveal_expires_at?: string | null;
  reveal_blocked_reason?: "expired" | "cookie_required" | null;
  seats?: number;
};

function formatRemainingTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
}

export function SuccessActivationCard({ checkoutId, customerPortalUrl }: SuccessActivationCardProps) {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPolling, setIsPolling] = useState(Boolean(checkoutId));
  const [pollError, setPollError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isLicenseRevealed, setIsLicenseRevealed] = useState(false);
  const [revealExpiresAt, setRevealExpiresAt] = useState<string | null>(null);
  const [revealBlockedReason, setRevealBlockedReason] = useState<"expired" | "cookie_required" | null>(null);
  const [revealRemainingSeconds, setRevealRemainingSeconds] = useState<number | null>(null);
  const [teamSeats, setTeamSeats] = useState<number | null>(null);
  const canUseLicenseKey = Boolean(licenseKey && !revealBlockedReason);

  async function copyLicenseKey() {
    if (!licenseKey) return;
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopyState("copied");
    } catch {
      setIsLicenseRevealed(true);
      // Select only after React has replaced the masked value with the key.
      window.requestAnimationFrame(() => {
        const node = document.getElementById("success-license-key-value");
        if (!node) return;
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
    }
  }

  useEffect(() => {
    if (!checkoutId) return;
    let cancelled = false;
    let attempts = 0;
    let timeout: number | undefined;
    async function lookup() {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/${encodeURIComponent(checkoutId!)}`, {
          cache: "no-store", credentials: "include"
        });
        if (cancelled) return;
        const data = await response.json() as CheckoutActivationResponse;
        if (response.ok) {
          if (data.seats) {
            setTeamSeats(data.seats);
            setIsPolling(false);
            return;
          }
          if (data.license_key) {
            setLicenseKey(data.license_key);
            setRevealExpiresAt(data.reveal_expires_at ?? null);
            setIsPolling(false);
            return;
          }
        }
        if (response.status === 403 || response.status === 410) {
          setRevealBlockedReason(data.reveal_blocked_reason ?? "cookie_required");
          setLicenseKey(null);
          setIsPolling(false);
          return;
        }
        const transient = [404, 422, 429].includes(response.status) || response.status >= 500;
        if (!response.ok && !transient) {
          setPollError("We couldn't retrieve the license. Sign into the customer portal below.");
          setIsPolling(false);
          return;
        }
      } catch {
        // Retry short-lived provider and network failures without exposing details.
      }
      if (cancelled) return;
      if (attempts >= 45) {
        setIsPolling(false);
        setPollError("Your key may still be processing. Sign into the customer portal to retrieve it.");
        return;
      }
      timeout = window.setTimeout(lookup, 2000);
    }
    void lookup();
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [checkoutId]);

  useEffect(() => {
    if (!revealExpiresAt) return;
    function tick() {
      const remaining = Math.max(0, Math.ceil((Date.parse(revealExpiresAt!) - Date.now()) / 1000));
      setRevealRemainingSeconds(remaining);
      if (remaining === 0) {
        setRevealBlockedReason("expired");
        setLicenseKey(null);
      }
    }
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [revealExpiresAt]);

  if (isDismissed) return null;

  if (teamSeats !== null) {
    return (
      <section className="contentCard contentCardTight successFlowCard">
        <div className="successFlowHeader">
          <div>
            <h2>Assign your {teamSeats} seats</h2>
            <p>
              Your team plan is active. Open the customer portal and assign
              each seat by email, including one for yourself if you use Local
              AI Cat too: your seat is your Pro, there&rsquo;s nothing else to
              buy. Every person gets an invite and their own license key, which
              they paste into Settings → Activate License.
            </p>
          </div>
          <span className="successStateBadge successStateBadgeReady">Seats ready</span>
        </div>
        <div className="routeActions">
          {customerPortalUrl ? (
            <a className="planButton" href={customerPortalUrl}>
              Assign seats
            </a>
          ) : null}
          <a className="secondaryButton" href="/#download">
            Download Outdoor Cat
          </a>
        </div>
      </section>
    );
  }

  let headlineLabel = "Manual recovery";
  let headlineTone = "manual";
  if (revealBlockedReason === "expired") {
    headlineLabel = "Reveal closed";
  } else if (revealBlockedReason === "cookie_required") {
    headlineLabel = "Verify your purchase";
  } else if (licenseKey) {
    headlineLabel = "License ready";
    headlineTone = "ready";
  } else if (isPolling) {
    headlineLabel = "Issuing license";
    headlineTone = "working";
  }

  return (
    <section className="contentCard contentCardTight successFlowCard">
      <div className="successFlowHeader">
        <div>
          <h2>{revealBlockedReason === null ? "Activate Local AI Cat" : "Use the customer portal"}</h2>
          {revealBlockedReason === null ? (
            <p>
              Copy your license key below, then open Local AI Cat and paste it
              into <strong>Settings → Activate License</strong>.
            </p>
          ) : null}
          {revealRemainingSeconds !== null && revealBlockedReason === null ? (
            <p className="successFootnote" style={{ marginTop: "0.5rem" }}>
              <strong>Claim soon:</strong> this page only shows your key for{" "}
              {formatRemainingTime(revealRemainingSeconds)} more — recover later
              from the customer portal if you need to.
            </p>
          ) : null}
        </div>
        <span className={`successStateBadge successStateBadge${headlineTone[0].toUpperCase()}${headlineTone.slice(1)}`}>
          {headlineLabel}
        </span>
      </div>

      {revealBlockedReason === "expired" ? (
        <p className="successLead">
          The one-time reveal window for this page has closed. You can still
          retrieve your license key from the{" "}
          {customerPortalUrl ? (
            <a className="textLink" href={customerPortalUrl}>customer portal</a>
          ) : (
            "customer portal"
          )}{" "}
          at any time.
        </p>
      ) : null}

      {revealBlockedReason === "cookie_required" ? (
        <p className="successLead">
          We need to verify that this purchase is yours. Sign into the{" "}
          {customerPortalUrl ? (
            <a className="textLink" href={customerPortalUrl}>customer portal</a>
          ) : (
            "customer portal"
          )}{" "}
          with the email you used at checkout to retrieve your license key.
        </p>
      ) : null}

      {canUseLicenseKey && licenseKey ? (
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
      ) : revealBlockedReason ? null : (
        <p className="successLead">
          {pollError ??
            "We couldn’t fetch your license automatically. Use the customer portal below to retrieve it, or reopen this success link."}
        </p>
      )}

      <div className="routeActions">
        {customerPortalUrl ? (
          <a className="secondaryButton" href={customerPortalUrl}>
            Customer portal
          </a>
        ) : null}
        {!licenseKey ? (
          <a className="secondaryButton" href="/#download">
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

      {revealBlockedReason ? null : (
        <p className="successFootnote">
          Polar remains the source of truth for your subscription. You can
          always recover the issued key through the customer portal.
        </p>
      )}
    </section>
  );
}
