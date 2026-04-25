import { NextResponse } from "next/server";
import { redeemActivationToken } from "../../../../lib/activation-redeem";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export async function POST(request: Request) {
  let token: string | undefined;

  try {
    const body = (await request.json()) as { token?: string };
    token = body.token?.trim();
  } catch {
    return NextResponse.json(
      { error: "Activation token is required.", code: "invalid_request" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "Activation token is required.", code: "invalid_request" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const result = await redeemActivationToken(token);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: noStoreHeaders
  });
}
