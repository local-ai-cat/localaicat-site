import { NextResponse } from "next/server";
import { getCheckoutUrl, type BuySlug } from "../../../lib/env";

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
    const fallback = new URL("/contact", request.url);
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const checkoutUrl = getCheckoutUrl(slug as BuySlug);

  if (checkoutUrl) {
    return NextResponse.redirect(checkoutUrl, { status: 302 });
  }

  const fallback = new URL("/contact", request.url);
  fallback.searchParams.set("plan", slug);

  return NextResponse.redirect(fallback, { status: 302 });
}
