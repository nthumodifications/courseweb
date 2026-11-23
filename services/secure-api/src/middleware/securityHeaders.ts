import { secureHeaders } from "hono/secure-headers";

/**
 * Baseline browser protections for the auth server.
 *
 * The consent screen is the page that matters here: framed by another site, it
 * could be dressed up so a click on "allow" approves a client the user never
 * meant to. `X-Frame-Options: SAMEORIGIN` stops that. It does not affect silent
 * renewal, where the app frames /authorize and every answer is a redirect back
 * to the app: browsers apply framing rules to the page a redirect ends on, not
 * to the redirect itself.
 *
 * Cross-Origin-Opener-Policy is left off. Its default would cut the link
 * between a popup and the page that opened it, which is how some clients
 * receive the sign-in result.
 */
export const securityHeaders = () =>
  secureHeaders({ crossOriginOpenerPolicy: false });
