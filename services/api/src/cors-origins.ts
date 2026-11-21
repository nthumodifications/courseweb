/**
 * Browser origins allowed to call the API in production: the site, Cloudflare
 * preview deployments (*.nthumods.workers.dev) and local development on any
 * port. Returns the origin to echo back, or null to send no CORS header.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/nthumods\.com$/,
  /^https:\/\/([a-z0-9-]+\.)+nthumods\.workers\.dev$/,
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/,
];

export const allowedCorsOrigin = (origin: string | undefined | null) =>
  origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
    ? origin
    : null;
