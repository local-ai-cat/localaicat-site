import { NextResponse } from "next/server.js";
import { getCheckoutUrl, type BuySlug } from "../../../lib/env.ts";

const VALID_SLUGS: ReadonlySet<string> = new Set<BuySlug>([
  "pro-monthly",
  "pro-annual",
  "developer-mode",
  "team-annual"
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!VALID_SLUGS.has(slug)) {
    const fallback = new URL("/pricing/direct", request.url);
    return NextResponse.redirect(fallback, { status: 302 });
  }

  // Team goes through /team, which says what the checkout actually sells
  // (per-seat keys, or one license until seat billing is configured).
  if (slug === "team-annual") {
    return NextResponse.redirect(new URL("/team", request.url), { status: 302 });
  }

  const checkoutUrl = getCheckoutUrl(slug as BuySlug);

  if (checkoutUrl) {
    return NextResponse.redirect(checkoutUrl, { status: 302 });
  }

  const fallback = new URL("/pricing/direct", request.url);
  fallback.searchParams.set("checkout", "unavailable");
  fallback.searchParams.set("plan", slug);

  return NextResponse.redirect(fallback, { status: 302 });
}
