import { createHmac, timingSafeEqual } from "node:crypto";
import { getActivationTokenSecret } from "./env.ts";

/**
 * Per-checkout reveal cookie. Carries its own immutable `issuedAt` timestamp
 * signed with HMAC-SHA256 so the route handler can:
 *
 *  - decide if this browser's grace/reveal window is still open
 *    without trusting Polar's `modified_at` (which can drift on unrelated
 *    updates), and
 *  - reject forged values: an attacker who knows the cookie name still
 *    can't produce a valid HMAC without the secret.
 *
 * Format: `<issuedAt_ms>.<hex_hmac>` so it stays human-debuggable.
 */
export type RevealCookiePayload = {
  issuedAt: number;
};

export function revealCookieName(checkoutId: string): string {
  // Lightweight FNV-1a hash; keeps cookie names short and per-checkout. The
  // name being public is fine — the value is what's authenticated.
  let hash = 0x811c9dc5;
  for (let i = 0; i < checkoutId.length; i++) {
    hash ^= checkoutId.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return `lacat_v1_${hash.toString(16)}`;
}

function signature(checkoutId: string, issuedAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${checkoutId}.${issuedAt}`)
    .digest("hex");
}

export function mintRevealCookieValue(checkoutId: string, now: Date = new Date()): string {
  const secret = getActivationTokenSecret();
  if (!secret) {
    throw new Error("Cannot mint reveal cookie without an activation token secret.");
  }
  const issuedAt = now.getTime();
  const sig = signature(checkoutId, issuedAt, secret);
  return `${issuedAt}.${sig}`;
}

export function verifyRevealCookieValue(
  checkoutId: string,
  value: string | undefined
): RevealCookiePayload | null {
  if (!value) return null;
  const secret = getActivationTokenSecret();
  if (!secret) return null;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null;

  const issuedAtRaw = value.slice(0, dot);
  const presented = value.slice(dot + 1);
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;

  const expected = signature(checkoutId, issuedAt, secret);
  if (presented.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(presented, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  return { issuedAt };
}
