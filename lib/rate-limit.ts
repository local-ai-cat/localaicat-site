import { Redis } from "@upstash/redis";
import { getActivationTokenRedisConfig } from "./env.ts";

const KEY_PREFIX = "rate-limit:";
export type RateLimitCounter = (key: string, windowSeconds: number) => Promise<number>;
export type RateLimitDecision = "allowed" | "limited" | "unavailable";

function upstashCounter(): RateLimitCounter | null {
  const config = getActivationTokenRedisConfig();
  if (!config) return null;
  const redis = new Redis(config);
  return async (key, windowSeconds) => {
    // Increment and expiry are atomic; a failed expiry must not leave an immortal key.
    return redis.eval<[number], number>(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
      [key], [windowSeconds]
    );
  };
}

/** Anonymous Polar spend fails closed if its shared quota cannot be enforced. */
export async function checkRateLimit(
  route: string,
  caller: string,
  limit: number,
  windowSeconds: number,
  globalLimit: number,
  counter: RateLimitCounter | null = upstashCounter()
): Promise<RateLimitDecision> {
  if (!counter) return "unavailable";
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  try {
    const count = await counter(`${KEY_PREFIX}${route}:caller:${caller}:${window}`, windowSeconds);
    if (!Number.isSafeInteger(count) || count < 1) return "unavailable";
    if (count > limit) return "limited";
    const total = await counter(`${KEY_PREFIX}${route}:global:${window}`, windowSeconds);
    if (!Number.isSafeInteger(total) || total < 1) return "unavailable";
    return total > globalLimit ? "limited" : "allowed";
  } catch {
    return "unavailable";
  }
}

/** Vercel overwrites x-real-ip; the fallback supports a trusted local reverse proxy. */
export function callerAddress(headers: Headers): string {
  return headers.get("x-real-ip")
    ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}
