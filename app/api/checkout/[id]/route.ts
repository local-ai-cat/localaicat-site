import { NextResponse } from "next/server";
import { activationTokenExpiresAt } from "../../../../lib/activation-tokens";
import { resolveCheckoutSuccessState } from "../../../../lib/polar-checkout";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const state = await resolveCheckoutSuccessState(id, {
    includeCustomerPortalUrl: false
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

  if (!state.licenseKey) {
    return NextResponse.json(
      { error: "No active license keys found for this purchase." },
      { status: 404, headers: noStoreHeaders }
    );
  }

  // The activation token is best-effort. If it fails to mint we still return
  // the license key so the page can show it for manual paste, then keep
  // polling for the token in the background to enable the deep link.
  return NextResponse.json(
    {
      license_key: state.licenseKey,
      activation_token: state.activationToken ?? null,
      expires_at: state.activationToken
        ? activationTokenExpiresAt(state.activationToken)?.toISOString() ?? null
        : null
    },
    { headers: noStoreHeaders }
  );
}
