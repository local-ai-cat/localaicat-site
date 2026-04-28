import { NextRequest, NextResponse } from "next/server";
import { activationTokenExpiresAt } from "../../../../lib/activation-tokens";
import {
  REVEAL_WINDOW_MS,
  resolveCheckoutSuccessState,
  revealCookieNameForCheckout
} from "../../../../lib/polar-checkout";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const cookieName = revealCookieNameForCheckout(id);
  const viewerHasRevealCookie = request.cookies.has(cookieName);

  const state = await resolveCheckoutSuccessState(id, {
    includeCustomerPortalUrl: false,
    viewerHasRevealCookie
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
    return NextResponse.json(
      { error: "No active license keys found for this purchase." },
      { status: 404, headers: noStoreHeaders }
    );
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

  // Bind the reveal to this browser. Subsequent requests from a different
  // browser (or incognito) will lack this cookie and get 403'd above.
  if (!viewerHasRevealCookie) {
    response.cookies.set({
      name: cookieName,
      value: "1",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: Math.floor(REVEAL_WINDOW_MS / 1000),
      path: "/"
    });
  }

  return response;
}
