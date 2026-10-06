# Development setup investigation

Date: 2026-10-06

## Outcome

Frontend-only onboarding now has a safe default path:

```text
bun run setup
bun run dev:web
```

The setup command creates `apps/web/.env.development.local` from the single browser
example, without overwriting an existing file, and uses public read-only
production services. `bun run setup --full` is the explicit backend path: it
also creates ignored backend/data-sync env files, generates both Prisma clients,
and builds the API, secure API, and API-types declaration chain.

## Onboarding traps found

- The old quick start installed with `bun install --frozen-lockfile`, copied
  `apps/web/.env.example`, then told contributors to fill values that were not
  actually present in that example (`README.md`, pre-change `HEAD:119-127`).
  It also said backend example files did not exist (`HEAD:152-156`), although
  `services/api/.dev.vars.example` was tracked.
- The old web example had placeholder Supabase and Algolia values and omitted
  runtime auth variables used by the web app (`HEAD:apps/web/.env.example:1-29`;
  current code requires `apps/web/src/vite-env.d.ts:4-16`). The old root and web
  `.env.local.example` files were copied from the former server application and
  contained maintainer-only settings (`HEAD:.env.local.example:1-20`,
  `HEAD:apps/web/.env.development.local.example:1-20`). Both duplicates are removed.
- Vite loads environment files relative to `apps/web`, while the custom search
  override reads only `apps/web/.env` (`apps/web/vite.config.ts:9-35`). The
  tracked mode files use a local API in development (`apps/web/.env.development:1-5`),
  so a contributor who skipped the local override hit a missing local Worker.
  Vite ranks `.env.development` above `.env.local`, so setup writes `.env.development.local`, the only file that outranks it.
- API and auth client initialization throws when their URL is absent
  (`apps/web/src/config/api.ts:3-6`, `apps/web/src/config/auth.ts:3-8`).
  Supabase receives empty strings and can fail in the same situation
  (`apps/web/src/config/supabase.ts:4-7`). Safe public defaults avoid a boot
  crash without changing application source. No optional analytics/Sentry guard
  was needed: GTM has a source default (`apps/web/src/lib/gtm.ts:5`) and Sentry
  uses a fixed production DSN (`apps/web/src/main.tsx:15-28`).
- The old example documented variables no current web source reads:
  `VITE_SENTRY_DSN`, `VITE_API_TIMEOUT`, `VITE_ENABLE_ANALYTICS`,
  `VITE_ENABLE_ERROR_TRACKING`, and `VITE_APP_ENV`. They were removed from the
  single web example. `VITE_ENABLE_LOCAL_SEARCH` and the Algolia pair are real
  reads (`apps/web/src/lib/search-client.ts:79-85`, `305-330`).
- `turbo.json` makes `type-check`, `test`, and `lint` depend on upstream builds
  (`turbo.json:6-25`). `@courseweb/api-types` imports the actual API and secure
  API app types (`packages/api-types/src/api.ts:1-8`), while the API build runs
  Prisma generation (`services/api/package.json`, `build`; `services/api/package.json`,
  `prisma:generate`). A fresh web type-check therefore cannot be treated as
  trustworthy until the backend dist/API-types chain exists. The full setup
  path makes this order explicit.
- API docs had a non-existent `db:push`, copied a non-existent
  `services/api/.env.example`, and listed several values that were not read by
  the current Worker (`services/api/README.md`, pre-change `HEAD:592-618`).
  The current route-specific reads include calendar, weather, GitHub/Turnstile,
  auth introspection, KV, OCR, Supabase, Algolia, and optional AI values
  (`services/api/src/aca-calendar.ts:40-50`, `weather.ts:44-47`,
  `issue.ts:8-11`, `utils/auth.ts:42-53`, `shortlink.ts:32-53`,
  `config/supabase_server.ts:14-18`, `index.ts:34-45`).
- Secure API docs cloned a different repository, used macOS/Linux `cp`, and
  documented invalid security commands (`services/secure-api/README.md`,
  pre-change `HEAD:32-61`, `HEAD:361-373`). Its example documented split
  Firebase variables, but the runtime reads one base64 service-account value
  (`services/secure-api/src/config/firebase_admin.ts:8-12`); the example is now
  corrected and includes the server Supabase variables actually required by
  `src/config/supabase.ts:3-7`.
- The secure API runtime listens on 5002 (`services/secure-api/src/index.ts:14-18`),
  while its example said 3000. The example now uses 5002. The main Worker is
  port 5001 (`services/api/wrangler.toml:[dev]`), and Vite is normally 5173.
- Data-sync documentation used `npm` and `cp` even though the workspace has Bun
  scripts and a Windows batch helper (`tools/data-sync/README.md`, pre-change
  `HEAD:24-36`; `tools/data-sync/package.json:scripts`;
  `tools/data-sync/run-docker.bat`, `run-docker.sh`). Its four required values
  are mutation credentials, not frontend setup values
  (`tools/data-sync/src/utils.ts:69-82`).
- This checkout has Bun 1.3.4, while the repository pins Bun 1.3.11
  (`package.json:5`). The new setup/doctor command reports this clearly rather
  than silently installing with an unsupported runtime.

## Environment classification

Only browser-safe values are placed in `apps/web/.env.example`. The public
values below are already present in committed repository configuration; no
new secret was invented.

| Scope                                         | Public and safe default                                                                                                                                                                                              | Optional / degrades without it                                                                                                                                                                          | Maintainer-only secret or private config                                                                                                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                                           | `VITE_COURSEWEB_API_URL`, `VITE_NTHUMODS_AUTH_URL`, `VITE_AUTH_CLIENT_ID`, localhost redirect URIs, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, Algolia app ID/search-only key, Turnstile site key, `VITE_GTM_ID` | `VITE_ENABLE_LOCAL_SEARCH`; backup Algolia app ID/search-only key; analytics and issue-form features can be unused                                                                                      | None belongs in `VITE_*`; never use service-role/admin keys, passwords, signing keys, or tokens in the browser                                                                                                                                                                           |
| Web values documented previously but not read | None                                                                                                                                                                                                                 | N/A                                                                                                                                                                                                     | `VITE_SENTRY_DSN`, `VITE_API_TIMEOUT`, `VITE_ENABLE_ANALYTICS`, `VITE_ENABLE_ERROR_TRACKING`, and `VITE_APP_ENV` were stale documentation and were removed from the example                                                                                                              |
| Main API: public/non-secret configuration     | `SUPABASE_URL`, `NTHUMODS_AUTH_URL`, `NTHUMODS_OCR_BASE_URL`, Algolia app IDs, `NTHUMODS_AUTH_CLIENT_ID`, `GITHUB_CLIENT_ID`, `GITHUB_INSTALLATION_ID`, Cloudflare account/namespace IDs, `NODE_ENV`                 | `ALGOLIA_BACKUP_APP_ID`; `AI_PROVIDER_ORDER` and model override variables; `CALENDAR_API_KEY` and `CWA_API_KEY` are optional by route; AI provider availability is optional and Workers AI is a binding | `SUPABASE_SERVICE_ROLE_KEY`, primary/backup Algolia admin keys, `GOOGLE_AI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, GitHub app private key, auth client secret, Turnstile secret, Cloudflare KV API token, and local/remote `DATABASE_URL` |
| Main API bindings                             | `DB`, `AI`, `VENUE_RATE_LIMITER`, and `AI_RATE_LIMITER` come from Wrangler configuration (`services/api/wrangler.toml`)                                                                                              | AI/rate-limit behavior can be unavailable in a minimal local Worker                                                                                                                                     | Binding credentials and deployed secrets are maintainer-owned                                                                                                                                                                                                                            |
| Secure API                                    | Firebase project/client identifiers and OAuth client ID/redirect URI are non-secret configuration; `NODE_ENV` and `PORT=5002` are local settings; `SUPABASE_URL` is public                                           | Optional logging/rate-limit switches in the old example are not current source reads and remain commented only for historical context                                                                   | `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `NTHU_OAUTH_CLIENT_SECRET`, session/encryption secrets if reintroduced                                                                                       |
| Data-sync                                     | `SUPABASE_URL`, Algolia app ID, `SEMESTER`, and `CRON_PATTERN` are non-secret configuration                                                                                                                          | `SEMESTER` and `CRON_PATTERN` have code defaults                                                                                                                                                        | `SUPABASE_SERVICE_ROLE_KEY` and Algolia admin `ALGOLIA_API_KEY`                                                                                                                                                                                                                          |

The root `NEXT_PUBLIC_*` values in the old tracked root env files are from the
former application configuration, not the current Vite reads. They were not
copied into the web example. The root `.env` and mode files were inspected but
not rewritten in this scoped task.

## Changes made

- Replaced `apps/web/.env.example` with one commented, browser-safe example
  using the committed public Supabase, Algolia search-only, auth, API, GTM,
  and test Turnstile defaults.
- Removed the duplicate server-era `.env.local.example` files at the root and
  `apps/web/`.
- Added `bun run setup`, `bun run setup --full`, `bun run setup --dry-run`, and
  `bun run doctor` through the dependency-free `tools/dev-setup/index.mjs`.
  Pure helpers have tests in `tools/dev-setup/index.test.mjs`.
- Rewrote the root Development section and added `CONTRIBUTING.md` with the
  frontend, API, and auth/data-sync tracks, a Taiwan Traditional Chinese quick
  start, first-PR guidance, i18n commands, focused web checks, troubleshooting,
  and Windows notes.
- Corrected the API, secure API, and data-sync workspace onboarding docs and
  the secure API Firebase/port example.
- No application source, dictionary JSON, lockfile, generated directory, or
  existing tool source was changed. No optional source guard was necessary.

## Verification executed

Passed:

- `bun test tools/dev-setup/index.test.mjs` — 5 tests passed.
- `bunx prettier --check` on the edited Markdown, JSON, and setup-script files.
- `git diff --check`.

`bun run setup --dry-run` output:

```text
[!!] Bun 1.3.4 is installed, but this repo pins Bun 1.3.11. Install or activate Bun 1.3.11 (for example with your Bun version manager), then rerun the command.
Preparing frontend-only development with public production read-only services.
[plan] bun install --frozen-lockfile (skipped by --dry-run)
[plan] apps/web/.env.example -> apps/web/.env.development.local
[plan] bun run --cwd packages/shared build
[plan] bun run --cwd packages/ui build
Setup complete. Next: bun run dev:web
Open http://localhost:5173
```

`bun run setup --full --dry-run` additionally planned copies of the API,
secure-api, and data-sync env examples, both Prisma generation commands,
`bun run build:apis`, and `bun run build:api-types`.

Its complete planned command output was:

```text
[!!] Bun 1.3.4 is installed, but this repo pins Bun 1.3.11. Install or activate Bun 1.3.11 (for example with your Bun version manager), then rerun the command.
Preparing frontend and backend development files. Backend env files contain placeholders; fill them with maintainer-provided values before starting services.
[plan] bun install --frozen-lockfile (skipped by --dry-run)
[plan] apps/web/.env.example -> apps/web/.env.development.local
[plan] services/api/.dev.vars.example -> services/api/.dev.vars
[plan] services/secure-api/.env.example -> services/secure-api/.env
[plan] tools/data-sync/.env.example -> tools/data-sync/.env
[plan] bun run --cwd packages/shared build
[plan] bun run --cwd packages/ui build
[plan] bun run --cwd services/api prisma:generate
[plan] bun run --cwd services/secure-api prisma:generate
[plan] bun run build:apis
[plan] bun run build:api-types
Setup complete. Next: bun run dev:web
Open http://localhost:5173
```

`bun run doctor` was run as a check-only command and correctly exited 1 in this
checkout: Bun is 1.3.4 instead of 1.3.11, `.env.local` is absent, and the
frontend package `dist` directories are absent. `node_modules`, `package.json`,
`bun.lock`, and the web example were present.

Doctor output:

```text
[!!] Bun 1.3.4 is installed, but this repo pins Bun 1.3.11. Install or activate Bun 1.3.11 (for example with your Bun version manager), then rerun the command.
[ok] package.json is present.
[ok] bun.lock is present.
[ok] apps/web/.env.example is present.
[ok] node_modules is present.
[!!] apps/web/.env.development.local is missing; run bun run setup.
[!!] packages/shared/dist is missing; run bun run setup.
[!!] packages/ui/dist is missing; run bun run setup.
error: script "doctor" exited with code 1
```

Not executed by design: `bun install`, any Prisma generation, any build command,
the web dev server, or a data-loading/browser smoke test. The worktree has
junctioned `node_modules` and generated directories, so only dry-run setup was
allowed here. The baseline `bun run --cwd apps/web type-check` was started
before editing and produced no diagnostic before it was stopped after roughly
60 seconds; no `apps/web/src` source was changed, so an after-count comparison
was not applicable. A focused `bunx eslint` attempt was inconclusive because
the repository ESLint configuration raised its existing missing `pages`/`src/pages`
rule before checking these setup files.

## Remaining maintainer decisions

- Provide or document a supported way to activate Bun 1.3.11 on Windows and
  macOS. The current environment cannot run the non-dry setup path until that
  mismatch is resolved.
- Validate from a clean clone that Bun install plus the public example completes
  within the five-minute target, that production API CORS permits localhost,
  and that the auth service accepts the localhost callback URIs.
- Decide whether the committed public Supabase anon and Algolia search-only
  values should remain shared defaults or move to a dedicated development
  project/search application. Rotating them requires updating the example.
- Provide a supported local PostgreSQL/database seed and all secure-api signing,
  Firebase, OAuth, API, and data-sync credentials for contributors who need the
  full tracks. Full setup intentionally cannot invent these values.
- Decide whether backend local development should use production read-only data,
  a shared development Supabase project, or an explicit seed workflow. Until
  then, frontend-only development remains the supported zero-secret path.

## Manager verification addendum (2026-10-07)

Smoke-tested in a browser with only the example env, which the agent had not done. Three defects found and fixed:

- `.env.local` does not override `apps/web/.env.development` (Vite ranks the mode file higher), so API calls still went to `http://localhost:5001`. Setup now writes `apps/web/.env.development.local`.
- The production API sends no `Access-Control-Allow-Origin` for localhost, so pointing the browser straight at `https://api.nthumods.com` failed for weather, calendar and bus. Added a `/__api` dev-server proxy in `apps/web/vite.config.ts` and made it the example default.
- The Bun check failed on any version other than exactly 1.3.11. It now fails only below 1.3 and prints a notice for other patch versions.

Result after the fixes: `/zh/courses` listed 3,165 courses, `/zh/bus` showed departures and the sidebar showed academic calendar events, with zero console errors. `bun install` and the package builds were still not executed in this worktree.
