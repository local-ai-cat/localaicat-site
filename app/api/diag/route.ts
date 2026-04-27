import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const v = process.env.POLAR_ADMIN_KEY;
  return NextResponse.json({
    has_admin_key: !!v,
    admin_key_len: v?.length ?? 0,
    admin_key_prefix: v ? v.slice(0, 14) : null,
    api_base: process.env.POLAR_API_BASE_URL ?? null,
    portal_url: process.env.POLAR_CUSTOMER_PORTAL_URL ?? null,
    has_activation_secret: !!process.env.ACTIVATION_TOKEN_SECRET,
    has_kv: !!process.env.KV_REST_API_TOKEN,
    vercel_env: process.env.VERCEL_ENV ?? null
  });
}
