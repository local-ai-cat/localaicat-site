import { NextRequest, NextResponse } from "next/server";
import { activationTokenExpiresAt } from "../../../../lib/activation-tokens";
import {
  issueRevealCookieValue,
  parseRevealCookieValue,
  REVEAL_WINDOW_MS,
  resolveCheckoutSuccessState
} from "../../../../lib/polar-checkout";
import {
  mintRevealCookieValue,
  revealCookieName,
  verifyRevealCookieValue
} from "../../../../lib/reveal-cookie";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

function setRevealCookie(
  response: NextResponse,
  checkoutId: string,
  cookieName: string,
  hadValidCookie: boolean
) {
  // Bind every confirmed-checkout response to this browser, including the
  // transient "license not yet issued" path so a polling client gets the
  // cookie before the first-visit grace expires.
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
  const cookieName = revealCookieName(id);
  const cookieValue = request.cookies.get(cookieName)?.value;
  const verified = verifyRevealCookieValue(id, cookieValue);
  const cookieIssuedAt = verified?.issuedAt ?? null;

  const state = await resolveCheckoutSuccessState(id, {
    includeCustomerPortalUrl: false,
    cookieIssuedAt
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
    return NextResponse.json(
      {
        error: "Reveal cookie missing — recover the key via the customer portal.",
        reveal_blocked_reason: "cookie_required",
        reveal_expires_at: state.revealExpiresAt
      },
      { status: 403, headers: noStoreHeaders }
    );
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
      activation_token: state.activationToken ?? null,
      expires_at: state.activationToken
        ? activationTokenExpiresAt(state.activationToken)?.toISOString() ?? null
        : null,
      reveal_expires_at: state.revealExpiresAt
    },
    { headers: noStoreHeaders }
  );

  setRevealCookie(response, id, cookieName, verified !== null);
  return response;
}
