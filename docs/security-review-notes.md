# Security Review Notes

Date: 2026-05-06

Scope: auth, sensitive user data storage, secure API VM exposure, and misuse/abuse paths across the current codebase.

Status update:

- Fixed: secure API resource middleware now requires `ACCESS` tokens.
- Fixed: course prerequisite render paths no longer use `dangerouslySetInnerHTML`.
- Fixed: sensitive auth/chat/replication debug logs identified in this pass were removed.
- Fixed: calendar subscriptions now use dedicated calendar share tokens instead of general API keys in URLs.
- Deferred tracking issues: #800, #801, #802, #803, #804, #805.

## Highest Priority Findings

1. Tracked environment files contain public configuration, not obvious private secrets

   - `.env`, `.env.development`, and `.env.production` are tracked by git.
   - Current values appear to be public client configuration: public URLs, Supabase anon key, Algolia search key, Turnstile site key, OAuth client ID, GitHub app/client identifiers, Cloudflare account/namespace IDs, and OCR base URL.
   - This is not the same as leaking service-role keys, private keys, API tokens, database URLs, Firebase service accounts, or OAuth client secrets.
   - Residual risk: tracked env files make it easy to accidentally add real secrets later, and public keys still need backend/RLS/rate-limit assumptions to be correct.
   - Fix: keep public config tracked only if intentional, add comments naming them as public, and add secret scanning/pre-commit checks for private key patterns.

2. Refresh tokens accepted by secure API resource middleware

   - `services/secure-api/src/middleware/requireAuth.ts` looks up a token by string and does not require `type: "ACCESS"`.
   - A leaked refresh token can be used as a bearer token against protected resource endpoints.
   - Fix: query with `type: "ACCESS"` and add tests proving refresh tokens are rejected by `/api/*`.

3. API keys in URLs

   - `services/secure-api/src/middleware/apikey.ts`, `services/secure-api/src/api/calendar.ts`, and `services/api/src/calendar-proxy.ts` accept or forward API keys in query strings.
   - URL keys leak through logs, browser history, referrers, and shared links.
   - Fix: use header-only API keys for normal API calls. For calendar subscriptions, issue a separate scoped share token that can only read calendar ICS and is revocable independently.

4. Browser storage of sensitive material

   - `apps/web/src/hooks/contexts/useAuth.tsx` stores OIDC state in `window.localStorage` while requesting `offline_access`.
   - `apps/web/src/app/[lang]/(mods-pages)/settings/AIPreferences.tsx` stores user AI API keys in localStorage.
   - Fix: prefer a backend-for-frontend session with HttpOnly Secure cookies. At minimum, do not request `offline_access` by default and do not persist third-party API keys in localStorage.

5. User-controlled data stored through privileged Firebase Admin writes
   - `services/secure-api/src/api/kv_storage.ts` accepts `z.any()`.
   - `services/secure-api/src/api/replication.ts` uses `.passthrough()` and accepts unbounded `batchSize`.
   - Since the API writes as Firebase Admin, Firestore rules do not limit malformed or oversized user data.
   - Fix: strict schemas, max body size, max field sizes, max batch size, and per-user rate limits.

## Misuse And Abuse Vectors

1. Public shortlink creation and open redirect abuse

   - `services/api/src/shortlink.ts` lets anyone create a shortlink for any URL.
   - `services/api/src/shortlink-redirect.ts` validates only `http:`/`https:` before redirecting.
   - Abuse: phishing with trusted `nthumods.com/l/...` URLs, spam, KV storage exhaustion, reputation damage.
   - Fix: authenticate or rate-limit creation, allowlist internal domains for default sharing, add abuse reporting/revocation, and consider warning interstitials for external domains.

2. Public MCP endpoint resource consumption and error leakage

   - `services/api/src/mcp-server.ts` is unauthenticated, permits expensive searches/resources, and returns `error.stack` in JSON-RPC error responses.
   - Abuse: quota/cost burn against Algolia/Supabase, reconnaissance via stack traces, prompt/tool misuse by external clients.
   - Fix: remove stack traces from responses, add auth or strict rate limits, cap array sizes, and reduce `/resources/read courseweb://courses/all` exposure.

3. AI chat tool and prompt-injection risks

   - `services/api/src/chat/*` gives an LLM tool access to course search, course details, graduation requirements, PDF fetching/uploading, and user context.
   - Abuse: prompt injection can cause excessive tool calls, private context leakage in responses, cost spikes, or untrusted PDF/content processing.
   - Fix: hard cap tool calls, validate tool arguments, rate-limit per user, minimize user context sent to the model, and treat all model output as untrusted.

4. XSS from trusted-but-external course fields

   - `dangerouslySetInnerHTML` renders `course.prerequisites` in multiple web components.
   - Abuse: if upstream course data, Supabase content, or contribution flow is poisoned, stored XSS can steal localStorage tokens/API keys.
   - Fix: sanitize HTML before rendering or render as text/Markdown with a strict allowlist.

5. Search API parameter misuse

   - `services/api/src/search.ts` forwards user-controlled Algolia `filters`, `facetFilters`, `attributesToRetrieve`, and highlight tags.
   - Abuse: query-cost amplification, metadata enumeration, unsafe highlighted HTML if rendered unsafely downstream.
   - Fix: allowlist retrievable attributes, constrain filter grammar, reduce limits where possible, and rate-limit.

6. Sensitive logs

   - OIDC/session data and chat stream contents are logged in server/client code.
   - Abuse: logs become a secondary data store for identifiers, private academic data, and token-adjacent auth state.
   - Fix: remove debug logs or redact user/session/message content.

7. Build/deployment footgun
   - `services/secure-api/Dockerfile` uses `bun run build || true`.
   - Abuse/risk: type/build failures can be silently deployed to the secure API VM.
   - Fix: remove `|| true` from production build steps.

## VM Code Execution Boundary

No direct request-to-shell/code-execution sink was found in `services/secure-api/src` for `exec`, `spawn`, `child_process`, `eval`, `new Function`, or `Bun.spawn`.

Current VM risk is more likely from:

- stolen tokens/API keys,
- unbounded request/resource usage,
- overly broad privileged Firebase Admin writes,
- logs containing sensitive data,
- dependency/runtime compromise,
- exposed secrets in repo or image build context.

## External Guidance Checked

- OWASP API Security Top 10 2023: broken object/property authorization and unrestricted resource consumption.
- OWASP SSRF Prevention Cheat Sheet: allowlist URL destinations when server-side fetching user-influenced URLs.
- OWASP Top 10 for LLM Applications 2025: prompt injection, sensitive information disclosure, excessive agency, and unbounded consumption.
- OWASP HTML5 Security Cheat Sheet and ASVS: avoid sensitive data in localStorage/client-side storage.
- RFC 9700 OAuth 2.0 Security Best Current Practice: protect refresh token confidentiality, bind/rotate refresh tokens, and exact-match redirect URIs.

## Pen Tester Perspective

Likely attack chains to test defensively:

1. Stored XSS to token/API-key theft

   - Entry points: course data fields rendered with `dangerouslySetInnerHTML`, especially `course.prerequisites`.
   - Goal: execute script in the main origin, then read OIDC tokens, refresh tokens, AI API keys, and redirect state from localStorage.
   - Why it matters: localStorage currently contains sensitive material, so one stored XSS becomes account/session compromise.
   - Defensive tests: seed a harmless HTML canary in course prerequisite-like data, verify it is sanitized or rendered inert everywhere.

2. Refresh-token-as-access-token

   - Entry points: any secure API endpoint using `requireAuth`.
   - Goal: use a refresh token directly as `Authorization: Bearer ...`.
   - Why it matters: `requireAuth` does not restrict token type to `ACCESS`.
   - Defensive tests: automated integration test proving refresh tokens receive 401 on `/api/kv/*`, `/api/replication/*`, `/api/apikeys/*`.

3. API key leakage through calendar links

   - Entry points: `/api/calendar/ics/:userId?key=...`, `/calendar/ical/:userId?key=...`.
   - Goal: recover API keys from URL sharing, browser history, access logs, or analytics/referrers, then reuse them.
   - Defensive tests: verify no general API key is accepted in query strings; verify calendar sharing uses a one-purpose token.

4. Trusted-domain phishing through shortlinks

   - Entry points: unauthenticated `PUT /shortlink?url=...` and `/l/:slug`.
   - Goal: create trusted-looking `nthumods.com/l/...` redirects to attacker-controlled sites.
   - Defensive tests: external-domain shortlinks require auth/rate limits and show an interstitial or are blocked by policy.

5. Cost and quota exhaustion

   - Entry points: unauthenticated MCP, search, shortlink creation, issue creation, CCXP proxy login/OCR, AI chat, replication pushes.
   - Goal: burn Algolia/Supabase/GitHub/OCR/Gemini/Firestore quotas or CPU.
   - Defensive tests: per-IP and per-user limits, body-size limits, batch-size limits, and failure-mode tests when rate limiter bindings are missing.

6. Prompt injection and tool abuse

   - Entry points: `/chat`, MCP tooling, graduation requirement PDF fetch/upload flow.
   - Goal: coerce the model to call tools excessively, reveal user context, or transform trusted tool results into unsafe advice.
   - Defensive tests: adversarial prompts must not trigger unbounded tool calls, must not reveal hidden/system context, and must not bypass scope boundaries.

7. MCP reconnaissance

   - Entry points: `/mcp`.
   - Goal: enumerate tools/resources and use error responses to learn stack traces or internal implementation details.
   - Defensive tests: no stack traces in responses, auth/rate limit enabled, resource reads capped and audited.

8. GitHub issue spam and label abuse

   - Entry points: `/issue`.
   - Goal: create many issues or arbitrary labels through the GitHub App if Turnstile is optional or bypassed.
   - Defensive tests: Turnstile required in production, labels allowlisted, request sizes capped, per-IP throttling enforced.

9. User data mass assignment

   - Entry points: secure API KV and replication JSON payloads.
   - Goal: store unexpected fields, oversized nested objects, or malformed state that later breaks clients or leaks in exports.
   - Defensive tests: strict schemas reject unknown fields and oversized values; Firestore writes enforce per-user collection and document constraints.

10. Operational compromise from exposed secrets/build context
    - Entry points: tracked env files, Docker build context, logs.
    - Goal: obtain production credentials or token-adjacent logs.
    - Defensive tests: secret scanning in CI, env files removed from history, production image does not include unnecessary repo material, logs are redacted.

## Fix Impact Assessment

1. Clarify and guard tracked environment files

   - Security effect: mainly prevents future accidental secret commits; current tracked values do not look like private secrets.
   - User impact: none.
   - Engineering impact: low.
   - Migration notes: no rotation appears necessary for the visible values unless any backend policy assumes these public keys are secret. Add secret scanning and comments separating public config from private deployment secrets.

2. Require `ACCESS` token type in secure API `requireAuth`

   - Security effect: prevents refresh tokens from being replayed as resource-access bearer tokens.
   - User impact: normal users should not notice. Clients incorrectly sending refresh tokens to APIs will start receiving 401.
   - Engineering impact: low; add `type: "ACCESS"` to token lookup and tests.
   - Migration notes: verify web clients always use `user.access_token`, not `refresh_token`.

3. Remove general API keys from query strings

   - Security effect: prevents long-lived API keys from leaking through logs, browser history, and referrers.
   - User impact: existing calendar subscription URLs may break if changed abruptly.
   - Engineering impact: medium; normal APIs can move to headers, but calendar clients often cannot send custom headers.
   - Migration notes: introduce dedicated calendar share tokens first, support old URLs temporarily, then revoke/expire old query-key links.

4. Replace localStorage token/API-key persistence

   - Security effect: greatly reduces blast radius of XSS and malicious third-party script execution.
   - User impact: users may need to sign in more often unless a backend session is implemented.
   - Engineering impact: high for a backend-for-frontend HttpOnly cookie session; medium if reducing `offline_access` and moving to session/in-memory storage.
   - Migration notes: this should follow XSS hardening but not wait indefinitely; localStorage is what turns XSS into token theft.

5. Strict schemas and limits for KV/replication writes

   - Security effect: reduces mass assignment, malformed state, storage exhaustion, and client-breaking payloads.
   - User impact: old or malformed local data may stop syncing until cleaned or migrated.
   - Engineering impact: medium; requires defining versioned schemas for each stored object.
   - Migration notes: add schema versions and a tolerant migration path for existing Firestore documents.

6. Authenticate/rate-limit shortlink creation and handle external redirects

   - Security effect: reduces phishing, spam, and KV/cost abuse under the `nthumods.com` domain.
   - User impact: anonymous share-link creation may require login, CAPTCHA, or stricter quotas.
   - Engineering impact: low to medium depending on whether you add auth, Turnstile, or an external-link interstitial.
   - Migration notes: existing shortlinks can continue working, but add monitoring and revocation for abusive slugs.

7. Lock down public MCP

   - Security effect: reduces reconnaissance, stack-trace leakage, and database/search quota abuse.
   - User impact: external consumers of the MCP endpoint may need API keys or may lose broad resource access.
   - Engineering impact: low for removing stack traces; medium for auth/rate limiting and resource policy.
   - Migration notes: publish a supported access model if MCP is intended to be public.

8. Add AI chat guardrails, quotas, and context minimization

   - Security effect: reduces prompt-injection blast radius, private context disclosure, and model/API cost spikes.
   - User impact: some broad AI requests may be refused or truncated; responses may use fewer tools.
   - Engineering impact: medium; needs per-user quotas, tool-call caps, argument validation, and output policy.
   - Migration notes: start with hard caps and logging, then tune UX based on real usage.

9. Sanitize or stop rendering HTML from course fields

   - Security effect: directly blocks stored XSS from poisoned course/upstream data.
   - User impact: some formatting in prerequisites may be simplified or removed.
   - Engineering impact: low if rendering as plain text; medium if preserving safe formatting with an allowlist sanitizer.
   - Migration notes: sanitize on output immediately; later sanitize on ingestion for defense in depth.

10. Constrain search API parameters

    - Security effect: reduces data enumeration, unsafe highlight HTML, and query-cost abuse.
    - User impact: advanced clients may lose arbitrary Algolia filter/attribute access.
    - Engineering impact: low to medium; implement allowlists and stricter limits.
    - Migration notes: identify which frontend filters are actually used and allow only those.

11. Remove sensitive logs

    - Security effect: reduces secondary leakage of sessions, IDs, chat content, and auth state.
    - User impact: none.
    - Engineering impact: low; replace debug logs with structured, redacted events.
    - Migration notes: decide retention and deletion policy for old logs if production logs already contain sensitive data.

12. Require Turnstile and label allowlists for issue creation

    - Security effect: reduces GitHub issue spam and prevents arbitrary label manipulation.
    - User impact: users must complete verification before submitting issues.
    - Engineering impact: low.
    - Migration notes: make Turnstile mandatory only in production/testable environments; provide graceful failure when verification is unavailable.

13. Remove `|| true` from secure API Docker build
    - Security effect: prevents broken or partially built code from shipping to the secure API VM.
    - User impact: none except failed deployments become visible.
    - Engineering impact: low, though builds may initially fail and expose existing type/build debt.
    - Migration notes: fix build errors before enforcing in production CI if necessary.

## Suggested Fix Order

1. Fix refresh-token-as-access-token.
2. Sanitize `dangerouslySetInnerHTML` render paths.
3. Remove sensitive logs.
4. Add rate limits/body limits to secure API, shortlinks, MCP, issue creation, and AI chat.
5. Introduce calendar-only share tokens, then remove query-string general API keys.
6. Tighten KV/replication schemas with migration handling.
7. Reduce localStorage auth/API-key persistence.
8. Lock down MCP/search advanced parameters.
9. Remove Docker `|| true` and enforce clean builds.
10. Add secret scanning/comments for tracked public env config.
