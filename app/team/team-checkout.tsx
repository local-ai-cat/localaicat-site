"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { TeamCheckoutMode } from "../../lib/team-checkout";

type Tier = { min: number; max: number | null; price: number };

const TIERS: Tier[] = [
  { min: 2, max: 10, price: 40 },
  { min: 11, max: 25, price: 35 },
  { min: 26, max: null, price: 30 }
];

const MIN_SEATS = 2;
const MAX_SEATS = 100;
/** Without a seat product the checkout is one Pro Annual license. */
const SINGLE_LICENSE_PRICE = 40;
const SINGLE_LICENSE_DEVICES = 5;

function pricePerSeat(seats: number): number {
  for (const tier of TIERS) {
    if (seats >= tier.min && (tier.max === null || seats <= tier.max)) {
      return tier.price;
    }
  }
  return TIERS[0].price;
}

function tierLabel(tier: Tier): string {
  return tier.max ? `${tier.min}–${tier.max} seats` : `${tier.min}+ seats`;
}

export function TeamCheckout({ mode }: { mode: TeamCheckoutMode }) {
  const sellsSeats = mode === "seats";
  const [seats, setSeats] = useState(MIN_SEATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perSeat = useMemo(() => pricePerSeat(seats), [seats]);
  const total = sellsSeats ? seats * perSeat : SINGLE_LICENSE_PRICE;

  const adjustSeats = useCallback((delta: number) => {
    setSeats((s) => Math.max(MIN_SEATS, Math.min(MAX_SEATS, s + delta)));
  }, []);

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats, mode })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Could not connect. Please try again.");
      setLoading(false);
    }
  }, [seats, mode]);

  return (
    <div className="contentPage crewPage">
      <div className="contentHero">
        <p className="contentKicker">Team plan</p>
        <h1 className="contentTitle">Seats for your team.</h1>
        {sellsSeats ? (
          <p className="contentIntro">
            Seat-based access to the full direct-download build. Volume discounts
            kick in at 11 and 26 seats.
          </p>
        ) : (
          <p className="contentIntro">
            Seat billing isn&rsquo;t live yet. Today this checkout sells one Pro
            Annual license: one key that activates on up to{" "}
            {SINGLE_LICENSE_DEVICES} Macs. For a key per person,{" "}
            <Link href="/contact">talk to us</Link>.
          </p>
        )}
      </div>

      <section className="teamCheckoutCard">
        {sellsSeats ? (
          <div className="teamCheckoutTop">
            <div className="teamTiers">
              {TIERS.map((tier) => (
                <div
                  className={`teamTier ${seats >= tier.min && (tier.max === null || seats <= tier.max) ? "teamTierActive" : ""}`}
                  key={tier.min}
                >
                  <span className="teamTierRange">{tierLabel(tier)}</span>
                  <span className="teamTierPrice">£{tier.price}/seat/yr</span>
                </div>
              ))}
            </div>

            <div className="seatPickerRow">
              <label className="seatPickerLabel" htmlFor="seat-count">
                Seats
              </label>
              <div className="seatPicker">
                <button
                  aria-label="Remove seat"
                  className="seatButton"
                  disabled={seats <= MIN_SEATS}
                  onClick={() => adjustSeats(-1)}
                  type="button"
                >
                  &minus;
                </button>
                <input
                  className="seatInput"
                  id="seat-count"
                  max={MAX_SEATS}
                  min={MIN_SEATS}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setSeats(Math.max(MIN_SEATS, Math.min(MAX_SEATS, v)));
                  }}
                  type="number"
                  value={seats}
                />
                <button
                  aria-label="Add seat"
                  className="seatButton"
                  disabled={seats >= MAX_SEATS}
                  onClick={() => adjustSeats(1)}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>

            <div className="teamPriceSummary">
              <div className="teamPriceLine">
                <span className="teamPriceLabel">
                  {seats} seats &times; £{perSeat}/yr
                </span>
                <span className="teamPriceValue">£{total}/yr</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="teamCheckoutTop">
            <div className="teamPriceSummary">
              <div className="teamPriceLine">
                <span className="teamPriceLabel">
                  1 license &middot; up to {SINGLE_LICENSE_DEVICES} Macs
                </span>
                <span className="teamPriceValue">£{total}/yr</span>
              </div>
            </div>
          </div>
        )}

        <div className="teamCheckoutBottom">
          {error && <p className="teamCheckoutError">{error}</p>}
          <button
            className="planButton teamCheckoutButton"
            disabled={loading || mode === "unavailable"}
            onClick={handleCheckout}
            type="button"
          >
            {loading ? "Redirecting..." : `Checkout — £${total}/yr`}
          </button>
          {sellsSeats ? (
            <p className="teamCheckoutNote">
              Billed annually via Polar. After checkout, assign each seat in the{" "}
              <Link href="/manage">customer portal</Link>: each person gets an
              email invite and their own license key. Using it yourself?
              Assign yourself a seat; there&rsquo;s no separate Pro to buy.
            </p>
          ) : (
            <p className="teamCheckoutNote">
              Billed annually via Polar. Manage it in the{" "}
              <Link href="/manage">customer portal</Link>.
            </p>
          )}
        </div>
      </section>

      <section className="teamCheckoutInfo">
        <div className="teamInfoCard">
          <h3>{sellsSeats ? "What each seat gets" : "What the license gets"}</h3>
          <ul className="dualCardList">
            <li>Full Pro access on Mac</li>
            <li>Direct-download build</li>
            <li>{sellsSeats ? "Its own license key, claimed from the seat's email invite" : `Up to ${SINGLE_LICENSE_DEVICES} Macs on one key`}</li>
            <li>Standard support</li>
          </ul>
        </div>
        <div className="teamInfoCard">
          <h3>Need more?</h3>
          <p className="teamInfoBody">
            For managed rollout, .pkg packaging, invoicing, or custom
            onboarding — talk to us directly.
          </p>
          <Link className="secondaryButton" href="/contact">
            Contact sales
          </Link>
        </div>
      </section>
    </div>
  );
}
