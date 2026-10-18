import { NextResponse } from "next/server";
import { isAuthorizedHealthCaller, runBillingHealth } from "../../../../lib/billing-health";
import { getBillingHealthToken } from "../../../../lib/env";

// Every call reads live Polar and Redis state.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const expected = getBillingHealthToken();
  if (!expected) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  }
  if (!isAuthorizedHealthCaller(request.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }

  const report = await runBillingHealth(new URL(request.url).origin);
  return NextResponse.json(report, { status: report.ok ? 200 : 503, headers: NO_STORE });
}
