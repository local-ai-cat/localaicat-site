import { NextResponse } from "next/server";
import { getPolarAdminKey, getPolarApiBaseUrl } from "../../../../lib/env";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const adminKey = getPolarAdminKey();

  if (!adminKey) {
    return NextResponse.json(
      { error: "License key lookup is not configured." },
      { status: 503 }
    );
  }

  const apiBase = getPolarApiBaseUrl();

  // 1. Fetch the checkout session to get the customer ID
  const checkoutRes = await fetch(`${apiBase}/v1/checkouts/${id}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });

  if (!checkoutRes.ok) {
    return NextResponse.json(
      { error: "Checkout not found." },
      { status: checkoutRes.status === 404 ? 404 : 502 }
    );
  }

  const checkout = await checkoutRes.json();

  if (checkout.status !== "confirmed" && checkout.status !== "succeeded") {
    return NextResponse.json(
      { error: "Checkout is not yet confirmed." },
      { status: 422 }
    );
  }

  const customerId: string | undefined = checkout.customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "No customer associated with this checkout." },
      { status: 422 }
    );
  }

  // 2. List the customer's license keys via the admin API
  const keysRes = await fetch(
    `${apiBase}/v1/license-keys?customer_id=${customerId}&limit=10`,
    {
      headers: { Authorization: `Bearer ${adminKey}` },
      cache: "no-store"
    }
  );

  if (!keysRes.ok) {
    return NextResponse.json(
      { error: "Failed to retrieve license keys." },
      { status: 502 }
    );
  }

  const keysData = await keysRes.json();
  const items: Array<{ key: string; benefit_id: string; status: string }> =
    keysData.items ?? keysData.result ?? [];

  const activeKeys = items
    .filter((k) => k.status === "granted")
    .map((k) => ({ key: k.key, benefit_id: k.benefit_id }));

  if (activeKeys.length === 0) {
    return NextResponse.json(
      { error: "No active license keys found for this purchase." },
      { status: 404 }
    );
  }

  // Return only the first key — the success page uses it for the deep link
  return NextResponse.json({ license_key: activeKeys[0].key });
}
