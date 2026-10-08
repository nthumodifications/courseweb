import type { Context, Next } from "hono";

type Bucket = {
  tokens: number;
  lastRefillAt: number;
};

export type UserRateLimiterOptions = {
  capacity?: number;
  refillPerSecond?: number;
  now?: () => number;
};

export const createUserRateLimiter = ({
  capacity = 60,
  refillPerSecond = 1,
  now = Date.now,
}: UserRateLimiterOptions = {}) => {
  const buckets = new Map<string, Bucket>();

  const middleware = async (c: Context, next: Next) => {
    const user = c.get("user") as { userId?: unknown } | undefined;
    const forwardedFor = c.req.header("X-Forwarded-For");
    const ip =
      c.req.header("CF-Connecting-IP") ??
      forwardedFor?.split(",", 1)[0]?.trim() ??
      c.req.header("X-Real-IP") ??
      "unknown";
    const key =
      typeof user?.userId === "string" && user.userId.length > 0
        ? `user:${user.userId}`
        : `ip:${ip}`;
    const currentTime = now();
    const bucket = buckets.get(key) ?? {
      tokens: capacity,
      lastRefillAt: currentTime,
    };
    const elapsedSeconds = Math.max(
      0,
      (currentTime - bucket.lastRefillAt) / 1000,
    );
    bucket.tokens = Math.min(
      capacity,
      bucket.tokens + elapsedSeconds * refillPerSecond,
    );
    bucket.lastRefillAt = currentTime;

    if (bucket.tokens < 1) {
      const retryAfter = Math.max(
        1,
        Math.ceil((1 - bucket.tokens) / refillPerSecond),
      );
      buckets.set(key, bucket);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "rate_limited" }, 429);
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);
    await next();
  };

  return {
    middleware,
    reset: () => buckets.clear(),
  };
};

// The service runs as one Bun process on one VM, so process-local state is
// intentional. A distributed limiter would be needed if that topology changes.
export const userRateLimit = createUserRateLimiter().middleware;
