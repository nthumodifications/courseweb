# Browser storage

This document records credential-bearing browser storage used by `apps/web`.

| Name                 | Storage                                                                                                    | Holds                                                             | Lifetime                                                         | Cleared by                                                                           | When                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `oidc.user:*`        | `localStorage` via `WebStorageStateStore` in `apps/web/src/hooks/contexts/useAuth.tsx`                     | OIDC user record, including access, ID, and refresh tokens        | Persistent browser storage; OIDC expiry and refresh rules apply  | `clearCredentialStorage()` and the OIDC client cleanup                               | Explicit sign-out; browser/site storage removal                |
| `oidc.signinState:*` | `localStorage` via the same OIDC store                                                                     | OIDC sign-in transaction state                                    | Sign-in transaction; stale state is cleared by the OIDC client   | `clearCredentialStorage()` and OIDC stale-state cleanup                              | Callback completion, stale-state cleanup, or explicit sign-out |
| `ai_settings`        | `localStorage` through `readAiSettings()` / `writeAiSettings()` in `apps/web/src/lib/credentialStorage.ts` | Optional user-provided AI API key, custom-key flag, and `savedAt` | 90 days from `savedAt`; legacy records are stamped on first read | The owner helper on expiry or malformed data; `clearCredentialStorage()` on sign-out | Expiry, malformed/wrong-type read, or explicit sign-out        |
| `headless_ais`       | `localStorage` and `sessionStorage`                                                                        | Legacy proxy-login credential data                                | Legacy; no current writer                                        | `removeLegacyCredentialStorage()` and `clearCredentialStorage()`                     | Startup cleanup or explicit sign-out                           |
| `ACIXSTORE`          | Cookie                                                                                                     | Legacy proxy-login credential data                                | Legacy cookie lifetime                                           | `removeLegacyCredentialStorage()` and `clearCredentialStorage()`                     | Startup cleanup or explicit sign-out                           |

`redirectUri` is not a credential. It is a one-shot localStorage navigation value. `rememberPostSigninRedirect()` accepts only a same-origin path, and `consumePostSigninRedirect()` removes it whether the value is accepted or rejected.

## OIDC decision

The current OIDC flow intentionally keeps `offline_access`, `WebStorageStateStore` backed by localStorage, and `automaticSilentRenew`. The site is an installed PWA on iOS and Android, where iframe-based silent renew is unreliable. The refresh token keeps students signed in across launches; dropping `offline_access` or moving the store to sessionStorage would sign users out on each launch.

The durable fix is a backend-for-frontend session in `services/secure-api`; it is not part of this change.

## BFF follow-up

The BFF should own the OIDC callback, token exchange/refresh, and logout, then set a server-side session cookie with `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where compatible), a narrow `Path`, and an explicit expiry. It should proxy the authenticated route families currently called with browser bearer tokens: `/api/kv/:key`, `/api/replication/events/*`, `/api/replication/timetablesync/*`, `/api/calendar` share-token management, `/api/course-dates/:courseId`, `/api/admin/**`, the main API `/chat`, `/recruit/*`, and authenticated timetable-share calls.

The BFF must validate the session on every protected request, use an origin/CSRF token check for state-changing requests, and avoid logging or returning tokens. The web client would stop storing OIDC tokens and stop constructing `Authorization: Bearer ...` headers; it would use same-origin credentialed requests instead. Custom AI keys would remain a separate product decision and would not be moved into the session cookie without an explicit server-side storage design.
