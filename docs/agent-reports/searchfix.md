# Local search robustness review fixes

## What I found

- The review artifact at `C:/Users/chewt/AppData/Local/Temp/claude/C--Users-chewt-Repositories-courseweb/50ae76fc-608b-4983-ae4f-b83c61ab2ed5/scratchpad/w2/out-review-searchfix.md` identified seven findings: cache-write loss, successful manifests missing a semester, stale chunks pinned for the page lifetime, header-only deadlines, missing chunk integrity validation, leaked failed workers, and error-state result counts.
- `apps/web/src/lib/local-search/cache.ts:26-34` previously exposed cache writes as `Promise<void>`, while `apps/web/src/lib/local-search/cache.ts:79-85,134-140` swallowed IndexedDB write failures. That allowed cleanup to run after an unsuccessful replacement.
- `origin/main:services/api/src/search-chunk.ts:143-147,272-290,378-389` shows that the API exposes the chunk validity token through `ETag`; the chunk token is derived from semester, row count, and maximum update time, not from serialized chunk bytes.
- The dictionaries already contain `common.loading` in both `apps/web/src/dictionaries/en.json` and `apps/web/src/dictionaries/zh.json`, so no dictionary change was needed.

## Design decisions

- Cache replacement is write-confirmed: `set` and `setText` return `true` or `false`; `deleteSemester`/`deleteTextSemester` run only after `true`. A failed replacement falls back to the previous cached semester entry.
- A successfully fetched manifest without the requested semester throws `MissingLocalSearchChunkError` (`apps/web/src/lib/local-search/engine.ts:92-97,744`) and the adapter returns `handled: false` (`apps/web/src/lib/local-search/client.ts:64-84`). Failed or timed-out manifest/chunk loads may use the previous cache entry.
- Stale chunks schedule one background revalidation per semester (`apps/web/src/lib/local-search/engine.ts:161-162,621-697`): 30 seconds initially, doubling after failures, capped at 10 minutes. Scheduled timers are cancelled while the document is hidden and resumed on `visibilitychange`; successful data is indexed and swapped into the existing chunk object.
- `fetchJsonWithDeadline` (`apps/web/src/lib/local-search/deadline.ts:8-35`) keeps one controller and deadline through both `fetch` and `response.json()`. The total budgets are manifest 8 seconds, course chunk 30 seconds, text chunk 30 seconds (`engine.ts:158-160`), and API fallback 10 seconds (`search-client.ts:65,258-266`).
- Fresh course chunks compare a normalized weak/quoted ETag with the manifest `contentHash` when the ETag is exposed (`engine.ts:783-788`) and still enforce the API row count. The API does not provide a cryptographic hash of serialized chunk bytes, so the report does not claim byte-level hashing.
- Worker index builds dispose their worker on failure (`engine.ts:810-818`). Result counts retain the main markup and original count format except that loading text is shown only for `loading`/`stalled` with zero hits (`SearchContainer.tsx:268-271`; `PlannerSearchContainer.tsx:152-155`). Algolia flags, tier ordering, failover branches, and markup remain unchanged.

## What changed

- `apps/web/src/lib/local-search/cache.ts`: write success reporting for course/text caches.
- `apps/web/src/lib/local-search/deadline.ts`: shared total-body JSON deadline helper.
- `apps/web/src/lib/local-search/client.ts`: handled-false mapping for a valid manifest that omits a semester.
- `apps/web/src/lib/local-search/engine.ts`: atomic replacement sequencing, manifest distinction, ETag validation, stale revalidation/backoff/visibility handling, total-body deadlines, text write confirmation, and worker disposal.
- `apps/web/src/lib/search-client.ts`: uses the shared deadline helper for the API fallback.
- `apps/web/src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx` and `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/PlannerSearchContainer.tsx`: removed the error-to-null count branch while preserving existing markup and styling.
- `apps/web/src/lib/local-search/local-search.test.ts`: added regression coverage for failed course/text writes, missing semesters, stale recovery/backoff, ETag mismatch, body-stalling deadlines, and failed-worker disposal followed by successful local retry.
- No new UI strings, dictionary changes, dependency changes, production writes, commits, or pushes.

## Commands and results

Baseline before edits:

- `bun run --cwd apps/web type-check` — failed with the same two pre-existing diagnostics: `src/features/dining/useDining.ts:20` (`dining` missing from generated API types) and `worker.ts:842` (`CacheStorage.default` does not exist).
- `bun --no-env-file test src` from `apps/web` — `253 pass, 2 skip, 0 fail`; `1,065 expect()` calls across 255 tests.

Focused and final checks:

- `bun --no-env-file test src/lib/local-search/local-search.test.ts` — `33 pass, 0 fail`.
- `bun --no-env-file test src/lib/local-search/integration.test.ts` — `8 pass, 0 fail` against the in-process real search-chunk API.
- Required `bun --no-env-file test src`, run three separate times — each run: `260 pass, 2 skip, 0 fail`; `1,091 expect()` calls across 262 tests.
- `bun run --cwd apps/web type-check` — still only the two baseline diagnostics above; no changed-file diagnostic appeared.
- `bun run --cwd apps/web build` — passed twice; final run transformed 7,262 modules and completed the Vite/PWA build. Existing Browserslist, Tailwind, PDF eval, and large-chunk warnings remain.
- `bunx prettier --check` on every edited web file — passed after formatting only task-owned files.
- Scoped `bunx eslint` on every edited web file — blocked before linting because the junctioned dependency checkout lacks `@typescript-eslint/recommended` from `packages/eslint-config/index.js`.
- `git diff --check` — passed. The tracked diff is limited to the two containers, local-search files/tests, `search-client.ts`, and this report; the new deadline helper is also under `local-search`.

Real-data and UI verification:

- Read-only `GET https://api.nthumods.com/search/chunk/manifest` returned HTTP 200, 2,564 bytes; `GET https://api.nthumods.com/search/chunk/11510` returned HTTP 200, 2,608,412 bytes. The live manifest reports `11510` row count `3165`; its `contentHash` equals the live chunk ETag after normalizing `W/"..."`.
- Started `bun run --cwd apps/web dev -- --port 5188 --strictPort`; after the first compile and a 30-second wait, `GET /en/courses`, `GET /zh/courses`, `GET /en/student/planner`, and the local proxy manifest each returned HTTP 200. The course page rendered real 115-1 results (`3165 results`) in a 390x844 Chrome screenshot; the planner landing page rendered its mobile shell and course-search entry.
- Captured equivalent 390x844 branch and temporary `origin/main`-expression baseline screenshots of the course and planner pages. Outside the intentionally toggled result-count expressions, the rendered layout, gutters, spacing, rows, and navigation were unchanged. Temporary screenshots/profiles were deleted, and port 5188 was verified free.
- No POST, PUT, or DELETE request was sent to production, Supabase, or GitHub.

## Unverified and open questions

- The broad type-check cannot be cleanly green until the two pre-existing diagnostics are fixed; scoped ESLint cannot start until the missing shared config is available.
- The API currently supplies a metadata-derived ETag rather than a serialized-body hash. The implementation validates the ETag when exposed and row count, but does not claim cryptographic body integrity.
- The planner course-picker dialog itself was not opened in the browser pass; its count expression is covered by source review and the shared local-search tests. A manual hidden-tab/visibility transition was not exercised in Chrome; fake-timer coverage verifies the retry cadence and no retry storm.
- Changes are intentionally left uncommitted on `fix/local-search-robustness`.
