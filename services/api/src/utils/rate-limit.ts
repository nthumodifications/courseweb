import type { Context, MiddlewareHandler } from "hono";
import type { Bindings } from "../index";

/**
 * Rate limiting middleware options
 */
export interface RateLimitOptions {
  /**
   * The rate limiter binding to use
   */
  limiter: keyof Pick<
    Bindings,
    | "VENUE_RATE_LIMITER"
    | "AI_RATE_LIMITER"
    | "MCP_RATE_LIMITER"
    | "SEARCH_RATE_LIMITER"
    | "SHORTLINK_RATE_LIMITER"
    | "ISSUE_RATE_LIMITER"
    | "CONTRIBUTE_RATE_LIMITER"
  >;

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

  /**
   * What to do when the limiter cannot give an answer: its binding is missing
   * or the call throws.
   *
   * - "allow" (default): let the request through. Right for cheap reads, where
   *   an outage of the limiter should not become an outage of the route.
   * - "block": answer 503. For routes where the limiter is what stands between
   *   a caller and something that costs money or writes on our behalf (an LLM
   *   call, a GitHub issue, a KV write, a request to the school). Running those
   *   unmetered is worse than being briefly unavailable. A missing binding is
   *   only blocked in production, so local development and tests still run
   *   without one.
   */
  whenUnavailable?: "allow" | "block";
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
 * Key generator for authenticated requests. The subject set by auth() is
 * trusted; caller-controlled query parameters and headers are deliberately
 * ignored so they cannot rotate the bucket.
 */
export const userIdKeyGenerator = (
  c: Context<{ Bindings: Bindings }>,
): string => {
  return c.get("user")?.sub || defaultKeyGenerator(c);
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
    whenUnavailable = "allow",
  } = options;

  return async (c, next) => {
    const unavailable = () => {
      c.header("Retry-After", "60");
      return c.json(
        { error: "Service temporarily unavailable. Please try again later." },
        503,
      );
    };

    const key = keyGenerator(c);
    const rateLimiter = c.env?.[limiter] as any;

    if (!rateLimiter) {
      console.error(`Rate limiter binding "${limiter}" not found`);
      if (
        whenUnavailable === "block" &&
        process.env.NODE_ENV === "production"
      ) {
        return unavailable();
      }
      // If rate limiter is not configured, allow the request to proceed
      return await next();
    }

    let success: boolean;
    try {
      ({ success } = await rateLimiter.limit({ key }));
    } catch (error) {
      console.error("Rate limiting error:", error);
      if (whenUnavailable === "block") return unavailable();
      // On error, allow the request to proceed to avoid blocking legitimate traffic
      return await next();
    }

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
