# NTHUMods Auth — integration guide for chumei.observe.tw

`https://auth.nthumods.com` is an OpenID Connect provider. It federates NTHU's
university OAuth, so signing in proves the user is an NTHU account holder.

## Credentials

|                           |                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issuer                    | `https://auth.nthumods.com`                                                                                                                                      |
| `client_id`               | `chumei-observe`                                                                                                                                                 |
| Client type               | Public — **PKCE S256 is required**, there is no client secret                                                                                                    |
| Granted scopes            | `openid`, `profile`, `email`, `offline_access`                                                                                                                   |
| Redirect URIs             | `https://chumei.observe.tw/auth/callback`, `https://chumei.observe.tw/auth/silent`, `http://localhost:3000/auth/callback`, `http://localhost:5173/auth/callback` |
| Post-logout redirect URIs | `https://chumei.observe.tw`, `http://localhost:3000`, `http://localhost:5173`                                                                                    |

A second, confidential client — `chumei-observe-api`, scope
`introspect:chumei-observe` — exists for backend token introspection. Its secret
is delivered out of band; it is not stored in this repository.

Redirect URIs are matched exactly, including scheme, host, port and path. To add
or change one, ask the NTHUMods maintainers.

## Endpoints

| Method | Path                                | Purpose                                                   |
| ------ | ----------------------------------- | --------------------------------------------------------- |
| GET    | `/.well-known/openid-configuration` | Discovery document                                        |
| GET    | `/.well-known/jwks.json`            | RS256 public key (`kid: "1"`) for `id_token` verification |
| GET    | `/authorize`                        | Start the login flow                                      |
| POST   | `/token`                            | Exchange a code, or refresh                               |
| GET    | `/userinfo`                         | Claims for an access token                                |
| GET    | `/logout`                           | End the session (RP-initiated logout)                     |
| POST   | `/revoke`                           | Revoke an access or refresh token                         |
| POST   | `/introspect`                       | Backend token validation (confidential client only)       |
| GET    | `/health`                           | Liveness probe                                            |

All OIDC endpoints send `Access-Control-Allow-Origin: *`, so browser-side calls
work. The NTHUMods data API under `/api/*` is restricted to `nthumods.com` and is
not part of this grant.

### GET /authorize

| Parameter               | Required    | Notes                                                                                                                                                                                                                                     |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_id`             | yes         | `chumei-observe`                                                                                                                                                                                                                          |
| `redirect_uri`          | yes         | Must match a registered URI exactly                                                                                                                                                                                                       |
| `response_type`         | yes         | `code` — the only supported value                                                                                                                                                                                                         |
| `scope`                 | yes         | Space-separated; must include `openid`. Only the granted scopes above                                                                                                                                                                     |
| `state`                 | yes         | Returned unchanged on the redirect back; use it for CSRF defence                                                                                                                                                                          |
| `code_challenge`        | yes         | Base64url SHA-256 of the verifier                                                                                                                                                                                                         |
| `code_challenge_method` | yes         | `S256` — `plain` is rejected                                                                                                                                                                                                              |
| `nonce`                 | recommended | Echoed into the `id_token`                                                                                                                                                                                                                |
| `prompt`                | no          | Defaults to `login`. `none` attempts silent auth, redirecting with `error=login_required` when no session exists or `error=consent_required` when the user is signed in but has not approved these scopes. `consent` re-asks deliberately |
| `ui_locales`            | no          | `en` or `zh` for the consent screen                                                                                                                                                                                                       |

```
https://auth.nthumods.com/authorize
  ?client_id=chumei-observe
  &redirect_uri=https%3A%2F%2Fchumei.observe.tw%2Fauth%2Fcallback
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &state=<random>
  &nonce=<random>
  &code_challenge=<base64url(sha256(verifier))>
  &code_challenge_method=S256
```

The user sees a consent screen naming Chumei and listing exactly the scopes
requested, then NTHU's login, and is redirected back to
`redirect_uri?code=…&state=…`. The authorization code is single-use and expires
after 5 minutes.

Consent is per user, per client, and is remembered — returning users go straight
through. It is asked again whenever the requested scope set grows beyond what
they approved, so keep the scope string stable. If the user declines, they are
sent back to `redirect_uri?error=access_denied&state=…`; handle that as a
cancelled sign-in rather than an error. Parameter errors come back as a JSON 400 from the
authorize endpoint rather than as a redirect, except `prompt=none`, which
redirects with an `error` parameter.

Use `https://chumei.observe.tw/auth/silent` in a hidden iframe with `prompt=none`
for background session renewal. Treat `consent_required` there as "send the user
through a visible sign-in", not as a failure.

### POST /token

`application/x-www-form-urlencoded`. There is no client authentication; PKCE is
what binds the code to your app.

Authorization code exchange:

```
grant_type=authorization_code
code=<code from the redirect>
redirect_uri=https://chumei.observe.tw/auth/callback
client_id=chumei-observe
code_verifier=<the original verifier, 43–128 chars of [A-Za-z0-9-._~]>
```

```json
{
  "access_token": "…",
  "refresh_token": "…",
  "id_token": "…",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

`refresh_token` is only present when `offline_access` was requested.

Refresh:

```
grant_type=refresh_token
refresh_token=<token>
```

Refresh tokens rotate — the old one is deleted and a new one returned in the same
response, so always persist the new value. No `id_token` is returned on refresh.

| Token              | Lifetime              |
| ------------------ | --------------------- |
| Authorization code | 5 minutes, single use |
| `access_token`     | 30 minutes            |
| `refresh_token`    | 30 days, rotating     |
| `id_token`         | 1 hour                |

Errors are `{"error": "invalid_grant"}` / `invalid_client` / `invalid_request`
with a 400 status.

### The id_token

RS256, `kid` `"1"`, verifiable against `/.well-known/jwks.json`.

```json
{
  "iss": "https://auth.nthumods.com",
  "aud": "chumei-observe",
  "sub": "<NTHU user id>",
  "name": "王小明",
  "name_en": "Wang Xiaoming",
  "inschool": true,
  "email": "…@gapp.nthu.edu.tw",
  "at_hash": "…",
  "nonce": "…",
  "exp": 1234567890
}
```

`name`, `name_en` and `inschool` require the `profile` scope; `email` requires
`email`. Verify `iss`, `aud`, `exp` and `nonce`. `sub` is the stable NTHU user
id — key your accounts on it, not on the email address.

### GET /userinfo

```
Authorization: Bearer <access_token>
```

Returns `sub` plus the same profile/email claims the token's scopes allow. A
401 with `{"error": "invalid_token"}` means expired or revoked.

### GET /logout

| Parameter                  | Required                              |
| -------------------------- | ------------------------------------- |
| `id_token_hint`            | yes — the `id_token` from login       |
| `post_logout_redirect_uri` | yes — must be a registered logout URI |
| `state`                    | no — echoed on the redirect           |

Deletes every access and refresh token issued to `chumei-observe` for that user,
clears the shared `auth.nthumods.com` session cookie, then redirects. Expired
`id_token`s are accepted as a hint.

### POST /revoke

```
token=<access or refresh token>
token_type_hint=refresh_token   # optional
client_id=chumei-observe
```

Always returns `200 {}`, per RFC 7009. Call it when a user signs out locally
without a full RP-initiated logout.

### POST /introspect

For backends only. HTTP Basic auth with `chumei-observe-api` and its secret:

```
Authorization: Basic base64(chumei-observe-api:<secret>)
Content-Type: application/x-www-form-urlencoded

token=<access or refresh token>
token_type_hint=access_token    # optional
```

```json
{
  "active": true,
  "client_id": "chumei-observe",
  "scope": "openid profile email offline_access",
  "username": "<NTHU user id>",
  "exp": 1234567890,
  "iat": 1234567890
}
```

Any failure — unknown token, expired, wrong audience — returns
`{"active": false}` with a 200. Verifying the `id_token` against the JWKS is
cheaper and is the better default; use introspection when you need to confirm an
access token has not been revoked.

## Recommended client setup

Any certified OIDC library works against the discovery document. For a browser
app, `oidc-client-ts`:

```ts
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export const userManager = new UserManager({
  authority: "https://auth.nthumods.com",
  client_id: "chumei-observe",
  redirect_uri: "https://chumei.observe.tw/auth/callback",
  silent_redirect_uri: "https://chumei.observe.tw/auth/silent",
  post_logout_redirect_uri: "https://chumei.observe.tw",
  response_type: "code",
  scope: "openid profile email offline_access",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});
```

PKCE is on by default in that library. Do not configure a `client_secret`.

## Known issue

`https://auth.nthumods.com/.well-known/jwks.json` currently returns
`500 Internal Server Error`, which breaks discovery-driven `id_token`
verification. The cause is the deployed environment, not the protocol flow — the
`JWT_PUBLIC_KEY` environment variable is missing or malformed on the production
host. Until it is fixed, either validate tokens through `/introspect`, or pin the
public key locally.
