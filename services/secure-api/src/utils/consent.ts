/**
 * Consent decisions for the authorization endpoint.
 *
 * These are the rules that decide whether a user is shown the consent screen or
 * sent straight back to the client, kept free of I/O so they can be tested
 * directly.
 */

/** How long a rendered consent screen stays actionable. */
export const CONSENT_REQUEST_EXPIRY = 15 * 60 * 1000; // 15 minutes

/**
 * Build a redirect back to a client.
 *
 * `base` must come from the client's registered `redirectUris`, never straight
 * from the query string, so the destination cannot be steered by the request.
 * Parameters are encoded rather than interpolated, so a `state` containing `&`
 * or `#` survives the round trip intact.
 */
export function buildClientRedirect(
  base: string,
  params: Record<string, string | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, value);
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${query.toString()}`;
}

export const sameScopes = (a: string[], b: string[]) =>
  a.length === b.length && a.every((scope) => b.includes(scope));

/** Does a stored grant already cover everything being asked for? */
export const coversScopes = (granted: string[], requested: string[]) =>
  requested.every((scope) => granted.includes(scope));

/**
 * Whether the consent screen must be shown.
 *
 * First-party NTHUMods clients are covered by the sign-up terms and are not
 * asked again. `prompt=consent` always re-asks, per OIDC Core.
 */
export function isConsentRequired({
  firstParty,
  prompt,
  grantedScopes,
  requestedScopes,
}: {
  firstParty: boolean;
  prompt?: string;
  grantedScopes: string[] | null;
  requestedScopes: string[];
}) {
  if (prompt === "consent") return true;
  if (firstParty) return false;
  if (!grantedScopes) return true;
  return !coversScopes(grantedScopes, requestedScopes);
}

/**
 * Whether an approval token matches the request it was issued for.
 *
 * The token names a row this server created when the screen rendered, bound to
 * the browser's session and to the exact request, so a client cannot skip the
 * screen by inventing the parameter itself.
 */
export function isPendingConsentValid(
  pending: {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    createdAt: Date;
  } | null,
  request: {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    scope: string[];
    now?: Date;
  },
) {
  if (!pending) return false;
  const now = request.now ?? new Date();
  return (
    pending.sessionId === request.sessionId &&
    pending.clientId === request.clientId &&
    pending.redirectUri === request.redirectUri &&
    sameScopes(pending.scopes, request.scope) &&
    pending.createdAt.getTime() + CONSENT_REQUEST_EXPIRY >= now.getTime()
  );
}
