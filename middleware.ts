import { NextResponse, type NextRequest } from "next/server";

// Gate the private /internal area with HTTP Basic Auth. The username is ignored; the password
// must equal INTERNAL_PASSWORD. Fail-closed everywhere except local development when the env var
// isn't set, so a preview or staging build with an unexpected NODE_ENV never opens the area.
export const config = { matcher: ["/internal/:path*"] };

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

// Edge has no node:crypto timingSafeEqual; comparing fixed-length digests byte by byte without an
// early exit keeps the comparison time independent of where the inputs differ.
async function passwordMatches(candidate: string, expected: string) {
  const [left, right] = await Promise.all([sha256(candidate), sha256(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function middleware(req: NextRequest) {
  const expected = process.env.INTERNAL_PASSWORD;

  if (!expected) {
    if (process.env.NODE_ENV !== "development") {
      return new NextResponse("Internal area is not configured.", { status: 503 });
    }
    return NextResponse.next(); // dev convenience
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (await passwordMatches(password, expected)) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    // Header values must be Latin-1 (ByteString). A non-ASCII character here (this realm
    // used an em dash) throws while constructing the response, turning every
    // unauthenticated request into a 500 instead of a login prompt.
    headers: { "WWW-Authenticate": 'Basic realm="Local AI Cat Internal"' },
  });
}
