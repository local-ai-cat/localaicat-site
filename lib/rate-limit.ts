import { Redis } from "@upstash/redis";
import { getActivationTokenRedisConfig } from "./env.ts";

const KEY_PREFIX = "rate-limit:";

export type RateLimitCounter = (key: string, windowSeconds: number) => Promise<number>;

function upstashCounter(): RateLimitCounter | null {
  const config = getActivationTokenRedisConfig();
  if (!config) return null;
  const redis = new Redis(config);
  return async (key, windowSeconds) => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count;
  };
}

/**
 * Fixed-window limit per caller for anonymous routes that spend the Polar
 * admin key. It guards spend rather than access, so it lets the request
 * through when no store is configured or the store errors.
 */
export async function isRateLimited(
  route: string,
  caller: string,
  limit: number,
  windowSeconds: number,
  counter: RateLimitCounter | null = upstashCounter()
) {
  if (!counter) return false;
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  try {
    return (await counter(`${KEY_PREFIX}${route}:${caller}:${window}`, windowSeconds)) > limit;
  } catch {
    return false;
  }
}

/** Vercel sets x-real-ip and the first x-forwarded-for hop from the connecting client. */
export function callerAddress(headers: Headers) {
  return headers.get("x-real-ip")
    ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}
