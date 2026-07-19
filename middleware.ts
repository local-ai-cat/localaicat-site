import { NextResponse, type NextRequest } from "next/server";

// Gate the private /internal area with HTTP Basic Auth. The username is ignored; the password
// must equal INTERNAL_PASSWORD. Fail-closed in production if the env var isn't set, and open in
// local dev so the area is viewable without a password.
export const config = { matcher: ["/internal/:path*"] };

export function middleware(req: NextRequest) {
  const expected = process.env.INTERNAL_PASSWORD;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Internal area is not configured.", { status: 503 });
    }
    return NextResponse.next(); // dev convenience
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (password === expected) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Local AI Cat — Internal"' },
  });
}
