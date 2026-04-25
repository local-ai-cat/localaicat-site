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

  if (!state.activationToken) {
    return NextResponse.json(
      { error: "Activation handoff is not configured." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  return NextResponse.json(
    {
      activation_token: state.activationToken,
      expires_at: activationTokenExpiresAt(state.activationToken)?.toISOString() ?? null
    },
    { headers: noStoreHeaders }
  );
}
