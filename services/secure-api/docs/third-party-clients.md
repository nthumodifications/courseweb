# Third-party OIDC clients on auth.nthumods.com

`auth.nthumods.com` is an OpenID Connect provider that federates NTHU OAuth.
Third parties integrate with it as registered OIDC clients.

## Registering a client

Clients live in the `Client` table of the secure-api Postgres database. Use the
management script (run from `services/secure-api`, with `DATABASE_URL` set):

```bash
# Inspect
bun run scripts/manage-clients.ts list
bun run scripts/manage-clients.ts show <client_id>

# Register / update a browser or mobile app (public client, PKCE enforced)
bun run scripts/manage-clients.ts upsert <client_id> \
  --name "Display Name" --client-uri https://example.com \
  --redirect-uri https://example.com/auth/callback \
  --logout-uri  https://example.com \
  --scope openid --scope profile --scope email --scope offline_access

# Register a machine-to-machine client that may introspect another client's tokens
bun run scripts/manage-clients.ts upsert <client_id>-api \
  --confidential --scope introspect:<client_id>

# Consent granted to a client, and withdrawing it
bun run scripts/manage-clients.ts consents <client_id>
bun run scripts/manage-clients.ts revoke-consent <client_id> [user_id]
```

`--name` is required for any third-party client that can reach `/authorize`,
because the consent screen shows it to the user. `--first-party` marks a client
as NTHUMods' own.

`upsert` merges redirect URIs, logout URIs and scopes into an existing record;
pass `--replace` to overwrite them, `--rotate-secret` to issue a new secret, and
`--dry-run` to preview. Secrets are printed once, at creation or rotation.

### Public vs confidential

Prefer **public clients**. `/authorize` only requires PKCE S256 when the client
has no `clientSecret`, and `/token` does not authenticate `client_secret` on the
`authorization_code` grant — so giving a browser app a secret weakens it rather
than strengthening it. Reserve confidential clients for backends that call
`/introspect`, which does verify the secret via HTTP Basic auth.

### Consent

Third-party clients cannot obtain an authorization code until the user has
approved them for the requested scopes. The approval is stored in
`ClientConsent`, keyed on `(userId, clientId)`, and the screen is shown again
whenever a client widens its scope request or sends `prompt=consent`.

A live `__session` cookie is **not** on its own permission to issue a code:
before this gate existed, anyone already signed in to nthumods.com had a code
minted for any newly registered client without seeing a prompt.

Approval is not something a client can assert for itself. Rendering the screen
opens a pending `AuthRequest`; its `state` comes back as the `consent` query
parameter and is checked against the browser session, the client, the redirect
URI, the exact scope set, and a 15-minute window. Declining sends the user back
to the client with `error=access_denied`.

First-party clients (`firstParty = true`) skip per-scope consent — they are
covered by the NTHUMods sign-up terms and keep their original one-time terms
screen — so marking a client first-party is what decides whether the gate
applies to it.

### Scope policy

Grant only what the integration needs. `openid`, `profile`, `email` and
`offline_access` cover identity. `kv`, `calendar` and `planner` expose NTHUMods
user data under `/api/*` and should stay with first-party clients.

A scope the client is not granted passes the `/authorize` validation but fails
with `invalid_scope` after the user returns from NTHU — so clients must request
only the scopes they were granted.

Note that `/api/*` also sets `Access-Control-Allow-Origin: https://nthumods.com`
only. Third-party browser code cannot call those routes even if scoped for them;
the OIDC routes at the root (`/authorize`, `/token`, `/userinfo`, …) allow any
origin.

## Registered third-party clients

| client_id            | Type          | Scopes                                | Purpose                                                               |
| -------------------- | ------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `chumei-observe`     | public (PKCE) | `openid profile email offline_access` | Sign in with NTHUMods on https://chumei.observe.tw, shown as "Chumei" |
| `chumei-observe-api` | confidential  | `introspect:chumei-observe`           | Backend token introspection for the above                             |

Integration guide for the chumei team: [`chumei-integration.md`](./chumei-integration.md).
