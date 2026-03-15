import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    commit: process.env.BUILD_COMMIT ?? "unknown",
    timestamp: new Date().toISOString()
  });
}
