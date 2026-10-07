# Search robustness port

## Findings and evidence

- `origin/main` keeps local search behind `VITE_ENABLE_LOCAL_SEARCH` and retains the Algolia primary/backup/fallback chain in `apps/web/src/lib/search-client.ts`. The Algolia client construction and tier ordering were left unchanged.
- `apps/web/src/lib/local-search/engine.ts:597-665` previously deleted older semester cache entries before fetching an un-cached manifest hash. The source branch's robust behavior is now present: `getLatest` is used after manifest/chunk failure, and old entries are deleted only after the replacement is stored (`engine.ts:652-665`; `cache.ts:25,63-79,170-175`).
- Public production evidence: `https://api.nthumods.com/search/chunk/manifest` returned HTTP 200 with 2,564 bytes; the real `11510` chunk at `https://api.nthumods.com/search/chunk/11510` returned HTTP 200 with 2,251,334 bytes. These were GET-only probes.
- The existing dictionaries already provide `common.loading` in English and Traditional Chinese (`apps/web/src/dictionaries/en.json:1292-1296`, `zh.json:1292-1296`), so no dictionary files were changed.

## Design decisions

- Cache replacement is transactional from the caller's perspective: fetch, normalize, validate row count, store the new value, then clean up old values. If manifest or chunk loading fails, the previous cached semester is indexed and served stale.
- AbortController deadlines match the source branch: manifest 8,000 ms, course chunk 30,000 ms, text chunk 30,000 ms (`engine.ts:136-168`). API fallback is 10,000 ms (`search-client.ts:64,253-280`). A local timeout is caught by the existing local-search adapter and continues to the unchanged Algolia chain; Algolia clients themselves were not given new timeout logic.
- `ResilientSearchClient.retry()` clears the failed local chunk memo (`search-client.ts:25,730`). The existing course error button calls it before the existing refresh (`courses/SearchContainer.tsx:131`); no planner markup or error-state styling was changed.
- Result counts keep the same span, classes, and markup. They use `useInstantSearch().status`: `common.loading` while loading/stalled with zero hits, nothing on error, and the original count otherwise (`courses/SearchContainer.tsx:164-273`, `PlannerSearchContainer.tsx:133-157`).

## Changes

- `apps/web/src/lib/local-search/cache.ts`: added semester-wide latest-entry lookup to IndexedDB and memory caches.
- `apps/web/src/lib/local-search/engine.ts`: added stale-cache recovery and the three local fetch deadlines.
- `apps/web/src/lib/search-client.ts`: added API fallback deadline and local retry API while preserving Algolia configuration and tier order.
- `apps/web/src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx`: gated the existing result text and wired the existing retry action.
- `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/PlannerSearchContainer.tsx`: gated only the existing result text.
- `apps/web/src/lib/local-search/local-search.test.ts:469-610,818-869`: added stale chunk/manifest recovery, old-entry retention, fake-timer deadlines, remote fallback after local timeout, and retry-without-reload coverage.

## Commands and results

Baseline, before edits:

- `bun run --cwd apps/web type-check` — failed with the same two pre-existing diagnostics: `src/features/dining/useDining.ts:20` missing API type `dining`, and `worker.ts:842` invalid `CacheStorage.default`.
- `bun --no-env-file test src` from `apps/web` — 247 pass, 2 skip, 0 fail; 1,051 expectations across 249 tests.

After edits:

- `bun --no-env-file test src/lib/local-search/local-search.test.ts` — 26 pass, 0 fail; 130 expectations.
- `bun --no-env-file test src` — 253 pass, 2 skip, 0 fail; 1,065 expectations across 255 tests.
- `bun run --cwd apps/web type-check` — still the same two pre-existing diagnostics above; no changed-file diagnostic appeared.
- `bunx eslint "src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx" "src/app/[lang]/(mods-pages)/student/planner/course-picker/PlannerSearchContainer.tsx" src/lib/local-search/cache.ts src/lib/local-search/engine.ts src/lib/local-search/local-search.test.ts src/lib/search-client.ts` — blocked before linting because the junctioned dependency checkout lacks `@typescript-eslint/recommended`.
- `bun run --cwd apps/web build` — passed; 7,261 modules transformed, Vite build completed in 32.16 s. Existing Browserslist, Tailwind, PDF eval, and large-chunk warnings remained.
- `git diff --check` — passed. `git diff origin/main --stat` shows only the six source/test files listed above; no dictionary or Algolia sponsor files changed.

Real-data and UI checks:

- Started `bun run --cwd apps/web dev -- --port 5188 --strictPort`, using a process-only `VITE_COURSEWEB_API_URL=http://localhost:5188/__api` override so the Vite proxy could read production safely.
- `GET /en/courses`, `GET /zh/courses`, and `GET /en/student/planner` on `http://localhost:5188` each returned HTTP 200 and the Vite app shell; the proxy manifest returned HTTP 200 with 2,564 bytes.
- Headless Chrome captured full-height 390x844 course and planner screenshots after the first lazy compile. The course screenshot showed real `115-1` results. A second course screenshot with only the new count text temporarily disabled matched outside that text block; the processing-time number naturally varied. The planner landing screenshot rendered the mobile planner shell.
- The dev server was stopped, port 5188 was verified free, and all temporary browser profiles/screenshots were removed.
- No POST, PUT, or DELETE request was made to production, Supabase, or GitHub.

## Unverified and open questions

- The planner course-picker search dialog was not opened during the screenshot pass, so its changed count text was not visually exercised; the component-level code and local-search tests cover the logic.
- Full type-check and scoped ESLint remain blocked by pre-existing repository/dependency issues described above. The build and all tests pass.
- Please confirm that 8 s / 30 s / 30 s / 10 s remain the desired deadlines and whether stale cached results should eventually receive a user-facing stale-data indicator.
- The planner component has no existing retry button in `origin/main`; `retry()` is available on the shared client, but adding a new planner control would violate the requested pixel-identical UI scope.
