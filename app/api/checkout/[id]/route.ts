import { NextRequest, NextResponse } from "next/server.js";
import {
  isPlausiblePolarId,
  REVEAL_WINDOW_MS,
  resolveCheckoutSuccessState
} from "../../../../lib/polar-checkout.ts";
import { buyerSessionCookieName, CUSTOMER_SESSION_HEADER } from "../../../../lib/polar-buyer-session.ts";
import { getActivationTokenSecret } from "../../../../lib/env.ts";
import { callerAddress, checkRateLimit } from "../../../../lib/rate-limit.ts";
import {
  mintRevealCookieValue,
  revealCookieName,
  verifyRevealCookieValue
} from "../../../../lib/reveal-cookie.ts";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer"
};

/** The success page polls every 2 s (30 a minute); twice that leaves headroom for reloads. */
const LOOKUPS_PER_MINUTE = 60;
const GLOBAL_LOOKUPS_PER_MINUTE = 600;

function clearBuyerSessionCookie(response: NextResponse, checkoutId: string): void {
  response.cookies.set({
    name: buyerSessionCookieName(checkoutId),
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

function setRevealCookie(
  response: NextResponse,
  checkoutId: string,
  cookieName: string,
  hadValidCookie: boolean
) {
  // A buyer-confirmed response is bound before the first-visit grace expires,
  // including while Polar is still issuing the purchased license.
  clearBuyerSessionCookie(response, checkoutId);
  if (hadValidCookie) return;
  response.cookies.set({
    name: cookieName,
    value: mintRevealCookieValue(checkoutId),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: Math.floor(REVEAL_WINDOW_MS / 1000),
    path: "/"
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isPlausiblePolarId(id)) {
    return NextResponse.json(
      { error: "Unknown checkout." },
      { status: 400, headers: noStoreHeaders }
    );
  }
  // Never spend the buyer's one-time claim if this deployment cannot bind it.
  if (!getActivationTokenSecret()) {
    return NextResponse.json(
      { error: "License lookup is temporarily unavailable. Use the customer portal." },
      { status: 503, headers: noStoreHeaders }
    );
  }
  const quota = await checkRateLimit("checkout", callerAddress(request.headers), LOOKUPS_PER_MINUTE, 60, GLOBAL_LOOKUPS_PER_MINUTE);
  if (quota !== "allowed") {
    return NextResponse.json(
      { error: quota === "limited" ? "Too many requests. Try again in a minute." : "License lookup is temporarily unavailable. Use the customer portal or try again shortly." },
      { status: quota === "limited" ? 429 : 503, headers: { ...noStoreHeaders, "Retry-After": "60" } }
    );
  }
  const cookieName = revealCookieName(id);
  const cookieValue = request.cookies.get(cookieName)?.value;
  const verified = verifyRevealCookieValue(id, cookieValue);
  const cookieIssuedAt = verified?.issuedAt ?? null;

  // Middleware moves Polar's success-redirect proof into an HttpOnly cookie
  // before the page renders. A direct API client may send the same proof in
  // a header. Only a cookieless first reveal needs it.
  const customerSessionToken = cookieIssuedAt === null
    ? request.cookies.get(buyerSessionCookieName(id))?.value ?? request.headers.get(CUSTOMER_SESSION_HEADER)
    : null;
  const state = await resolveCheckoutSuccessState(id, {
    includeCustomerPortalUrl: false,
    cookieIssuedAt,
    customerSessionToken
  });

  if (!state) {
    return NextResponse.json(
      { error: "License key lookup is not configured." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  if (state.checkoutStatus !== "confirmed" && state.checkoutStatus !== "succeeded") {
    return NextResponse.json(
      { error: "Checkout is not yet confirmed." },
      { status: 422, headers: noStoreHeaders }
    );
  }

  if (!state.customerId) {
    return NextResponse.json(
      { error: "No customer associated with this checkout." },
      { status: 422, headers: noStoreHeaders }
    );
  }

  if (state.seats) {
    return NextResponse.json({ seats: state.seats }, { headers: noStoreHeaders });
  }

  if (state.revealBlockedReason === "expired") {
    return NextResponse.json(
      {
        error: "Reveal window has expired.",
        reveal_blocked_reason: "expired"
      },
      { status: 410, headers: noStoreHeaders }
    );
  }

  if (state.revealBlockedReason === "cookie_required") {
    const response = NextResponse.json(
      {
        error: "Reveal cookie missing — recover the key via the customer portal.",
        reveal_blocked_reason: "cookie_required",
        reveal_expires_at: state.revealExpiresAt
      },
      { status: 403, headers: noStoreHeaders }
    );
    // A planted/expired provider proof must not block a genuine redirect retry
    // for its full TTL. Never clear an already verified reveal cookie.
    if (!verified) clearBuyerSessionCookie(response, id);
    return response;
  }

  if (!state.licenseKey) {
    // License hasn't been issued by Polar yet (still propagating). Still
    // bind this browser so the polling client doesn't fall out of the
    // grace window unauthenticated.
    const transient = NextResponse.json(
      { error: "No active license keys found for this purchase." },
      { status: 404, headers: noStoreHeaders }
    );
    setRevealCookie(transient, id, cookieName, verified !== null);
    return transient;
  }

  const response = NextResponse.json(
    {
      license_key: state.licenseKey,
      activation_token: null,
      expires_at: null,
      reveal_expires_at: state.revealExpiresAt
    },
    { headers: noStoreHeaders }
  );

  setRevealCookie(response, id, cookieName, verified !== null);
  return response;
}
