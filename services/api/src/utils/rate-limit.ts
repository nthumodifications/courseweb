import type { Context, MiddlewareHandler } from "hono";
import type { Bindings } from "../index";

/**
 * Rate limiting middleware options
 */
export interface RateLimitOptions {
  /**
   * The rate limiter binding to use
   */
  limiter: keyof Pick<Bindings, "VENUE_RATE_LIMITER">;

  /**
   * Function to generate the rate limit key from the request context
   * Default: uses IP address
   */
  keyGenerator?: (c: Context<{ Bindings: Bindings }>) => string;

  /**
   * Custom error message when rate limit is exceeded
   */
  errorMessage?: string;

  /**
   * HTTP status code to return when rate limited
   * Default: 429
   */
  statusCode?: number;
}

/**
 * Default key generator using IP address
 */
const defaultKeyGenerator = (c: Context<{ Bindings: Bindings }>): string => {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";
  return ip;
};

/**
 * Key generator that combines IP and path
 */
export const ipWithPathKeyGenerator = (
  c: Context<{ Bindings: Bindings }>,
): string => {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";
  const path = new URL(c.req.url).pathname;
  return `${ip}:${path}`;
};

/**
 * Key generator that uses user ID from query params or headers
 */
export const userIdKeyGenerator = (
  c: Context<{ Bindings: Bindings }>,
): string => {
  const userId =
    c.req.query("userId") ||
    c.req.header("x-user-id") ||
    c.req.header("authorization") ||
    defaultKeyGenerator(c);
  return userId;
};

/**
 * Creates a rate limiting middleware for Hono routes
 *
 * @example
 * ```typescript
 * const app = new Hono<{ Bindings: Bindings }>()
 *   .use("*", rateLimitMiddleware({
 *     limiter: "VENUE_RATE_LIMITER",
 *     keyGenerator: ipWithPathKeyGenerator,
 *     errorMessage: "Too many requests to venue API"
 *   }))
 *   .get("/", handler);
 * ```
 */
export const rateLimitMiddleware = (
  options: RateLimitOptions,
): MiddlewareHandler<{ Bindings: Bindings }> => {
  const {
    limiter,
    keyGenerator = defaultKeyGenerator,
    errorMessage = "Rate limit exceeded. Please try again later.",
    statusCode = 429,
  } = options;

  return async (c, next) => {
    const key = keyGenerator(c);
    const rateLimiter = c.env[limiter] as any;

    if (!rateLimiter) {
      console.error(`Rate limiter binding "${limiter}" not found`);
      // If rate limiter is not configured, allow the request to proceed
      return await next();
    }

    try {
      const { success } = await rateLimiter.limit({ key });

      if (!success) {
        return c.json(
          {
            error: errorMessage,
            retryAfter: 60, // Based on the period configured in wrangler.toml
          },
          statusCode as any,
        );
      }

      await next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      // On error, allow the request to proceed to avoid blocking legitimate traffic
      await next();
    }
  };
};

/**
 * Pre-configured rate limit middleware for venue endpoints
 */
export const venueRateLimitMiddleware = rateLimitMiddleware({
  limiter: "VENUE_RATE_LIMITER",
  keyGenerator: ipWithPathKeyGenerator,
  errorMessage: "Too many requests to venue API. Please try again in a minute.",
});
