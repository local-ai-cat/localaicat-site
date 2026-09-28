import { NextResponse } from "next/server";
import { getCheckoutUrl } from "../../../lib/env";
import { purrdainCheckoutUrl, purrdainSource } from "../../../lib/purrdain";

/** Hands off to the Pro Annual checkout with PURRDAIN prefilled. */
export async function GET(request: Request) {
  const source = purrdainSource(new URL(request.url).searchParams.get("src"));
  const checkoutLink = getCheckoutUrl("pro-annual");

  if (!checkoutLink) {
    const fallback = new URL("/contact", request.url);
    fallback.searchParams.set("plan", "pro-annual");
    return NextResponse.redirect(fallback, { status: 302 });
  }

  return NextResponse.redirect(purrdainCheckoutUrl(checkoutLink, source), { status: 302 });
}
