import { NextResponse } from "next/server";
import {
  getCheckoutUrl,
  getPolarAdminKey,
  getPolarApiBaseUrl,
  getPolarProductId,
  getSiteUrl
} from "../../../lib/env";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const seats = Math.max(2, Math.min(100, Number(body?.seats) || 2));

  const adminKey = getPolarAdminKey();
  const productId = getPolarProductId("team-annual");
  const apiBase = getPolarApiBaseUrl();
  const siteUrl = getSiteUrl();

  // Path 1: Dedicated seat-based product (when POLAR_PRODUCT_ID_TEAM_ANNUAL is set)
  if (adminKey && productId) {
    try {
      const res = await fetch(`${apiBase}/v1/checkouts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          products: [productId],
          seats,
          success_url: `${siteUrl}/success?checkout_id={CHECKOUT_ID}`
        })
      });

      if (res.ok) {
        const checkout = await res.json();
        const url = checkout.url || checkout.checkout_url;
        if (url) return NextResponse.json({ url });
      } else {
        const err = await res.text().catch(() => "");
        console.error("Polar seat-based checkout error:", res.status, err);
      }
    } catch (e) {
      console.error("Polar seat-based checkout exception:", e);
      // Fall through to path 2
    }
  }

  // Path 2: Create a checkout session for Pro Annual with metadata noting seat count
  const proAnnualId = getPolarProductId("pro-annual");
  if (adminKey && proAnnualId) {
    try {
      const res = await fetch(`${apiBase}/v1/checkouts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          products: [proAnnualId],
          metadata: { team_seats: String(seats) },
          success_url: `${siteUrl}/success?checkout_id={CHECKOUT_ID}`
        })
      });

      if (res.ok) {
        const checkout = await res.json();
        const url = checkout.url || checkout.checkout_url;
        if (url) return NextResponse.json({ url });
      }
    } catch {
      // Fall through to static link
    }
  }

  // Path 3: Static checkout link fallback
  const fallbackUrl = getCheckoutUrl("team-annual");
  if (fallbackUrl) {
    return NextResponse.json({ url: fallbackUrl });
  }

  return NextResponse.json(
    { error: "Team checkout is not configured." },
    { status: 503 }
  );
}
