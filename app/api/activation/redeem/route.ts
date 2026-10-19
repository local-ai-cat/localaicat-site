import { NextResponse } from "next/server";
import { MANUAL_ACTIVATION_MESSAGE } from "../../../../lib/license-activation";

export const runtime = "nodejs";

// A bearer intercepted by another custom-scheme handler must never yield a key.
export async function POST() {
  return NextResponse.json(
    { error: MANUAL_ACTIVATION_MESSAGE, code: "manual_activation_required" },
    { status: 410, headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" } }
  );
}
