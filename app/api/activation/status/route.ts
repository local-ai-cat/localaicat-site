import { NextResponse } from "next/server";
import { getActivationTokenStatus } from "../../../../lib/activation-status";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim()
    ?? url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "Activation token is required.", code: "invalid_request" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const result = await getActivationTokenStatus(token);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: noStoreHeaders
  });
}
