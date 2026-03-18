"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type Tier = { min: number; max: number | null; price: number };

const TIERS: Tier[] = [
  { min: 2, max: 10, price: 40 },
  { min: 11, max: 25, price: 35 },
  { min: 26, max: null, price: 30 }
];

const MIN_SEATS = 2;
const MAX_SEATS = 50;

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

export function TeamCheckout() {
  const [seats, setSeats] = useState(MIN_SEATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perSeat = useMemo(() => pricePerSeat(seats), [seats]);
  const total = seats * perSeat;

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
        body: JSON.stringify({ seats })
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
  }, [seats]);

  return (
    <div className="contentPage">
      <div className="contentHero">
        <p className="contentKicker">Team plan</p>
        <h1 className="contentTitle">Seats for your team.</h1>
        <p className="contentIntro">
          Seat-based access to the full direct-download build. Volume discounts
          kick in at 11 and 26 seats.
        </p>
      </div>

      <section className="teamCheckoutCard">
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

        <div className="teamCheckoutBottom">
          {error && <p className="teamCheckoutError">{error}</p>}
          <button
            className="planButton teamCheckoutButton"
            disabled={loading}
            onClick={handleCheckout}
            type="button"
          >
            {loading ? "Redirecting..." : `Checkout — £${total}/yr`}
          </button>
          <p className="teamCheckoutNote">
            Billed annually via Polar. Manage seats in the{" "}
            <Link href="/manage">customer portal</Link>.
          </p>
        </div>
      </section>

      <section className="teamCheckoutInfo">
        <div className="teamInfoCard">
          <h3>What each seat gets</h3>
          <ul className="dualCardList">
            <li>Full Pro access on Mac</li>
            <li>Direct-download build</li>
            <li>Seat management in portal</li>
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
