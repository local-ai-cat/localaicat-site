import { NextResponse } from "next/server";
import { resolveCheckoutSuccessState } from "../../../../lib/polar-checkout";

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
      { status: 503 }
    );
  }

  if (state.checkoutStatus !== "confirmed" && state.checkoutStatus !== "succeeded") {
    return NextResponse.json(
      { error: "Checkout is not yet confirmed." },
      { status: 422 }
    );
  }

  if (!state.customerId) {
    return NextResponse.json(
      { error: "No customer associated with this checkout." },
      { status: 422 }
    );
  }

  if (!state.licenseKey) {
    return NextResponse.json(
      { error: "No active license keys found for this purchase." },
      { status: 404 }
    );
  }

  return NextResponse.json({ license_key: state.licenseKey });
}
