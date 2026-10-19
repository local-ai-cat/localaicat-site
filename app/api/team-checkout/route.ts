import { NextResponse } from "next/server";
import {
  getPolarApiBaseUrl,
  getSiteUrl,
  getTeamCheckoutConfig
} from "../../../lib/env";
import { callerAddress, checkRateLimit } from "../../../lib/rate-limit";
import { teamCheckoutBody, teamCheckoutMode } from "../../../lib/team-checkout";
import { seatCount } from "../../../lib/team-seats";

/** Each call creates a Polar checkout session with the admin key. */
const CHECKOUTS_PER_MINUTE = 10;
const GLOBAL_CHECKOUTS_PER_MINUTE = 60;

export async function POST(request: Request) {
  const quota = await checkRateLimit("team-checkout", callerAddress(request.headers), CHECKOUTS_PER_MINUTE, 60, GLOBAL_CHECKOUTS_PER_MINUTE);
  if (quota !== "allowed") {
    return NextResponse.json(
      { error: quota === "limited" ? "Too many requests. Try again in a minute." : "Checkout is temporarily unavailable. Try again in a minute." },
      { status: quota === "limited" ? 429 : 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }
  const body = await request.json().catch(() => null);
  const seats = seatCount(body?.seats);
  const config = getTeamCheckoutConfig();
  const mode = teamCheckoutMode(config);
  // The page priced one mode; a deploy since it loaded may have changed it.
  if (body?.mode !== mode) {
    return NextResponse.json(
      { error: "This page is out of date. Reload it to see the current Team offer." },
      { status: 409 }
    );
  }
  const checkoutBody = teamCheckoutBody(mode, seats, config, getSiteUrl());

  if (checkoutBody && config.adminKey) {
    try {
      const res = await fetch(`${getPolarApiBaseUrl()}/v1/checkouts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.adminKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(checkoutBody)
      });

      if (res.ok) {
        const checkout = await res.json();
        const url = checkout.url || checkout.checkout_url;
        if (url) return NextResponse.json({ url, mode });
      } else {
        console.error("Polar team checkout error:", mode, res.status);
      }
    } catch {
      console.error("Polar team checkout unavailable:", mode);
    }
  }

  // The page priced N seats, so a failed seat checkout never quietly becomes
  // a single license. Only the single-license mode may use the static link.
  if (mode === "single-license" && config.staticTeamUrl) {
    return NextResponse.json({ url: config.staticTeamUrl, mode });
  }

  return NextResponse.json(
    { error: mode === "unavailable" ? "Team checkout is not configured." : "Checkout is unavailable right now. Try again in a minute." },
    { status: mode === "unavailable" ? 503 : 502 }
  );
}
