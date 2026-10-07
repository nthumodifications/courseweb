# Search robustness round 3 report

## Scope and evidence

This work is on `fix/local-search-robustness`, based on task-start commit `7bcee1bc`. I read `CONTRIBUTING.md`, `README.md`, and the second-review artifact at `C:/Users/chewt/AppData/Local/Temp/claude/C--Users-chewt-Repositories-courseweb/50ae76fc-608b-4983-ae4f-b83c61ab2ed5/scratchpad/w2/out-review-searchfix2.md` before editing.

The review found that cache writes could fail after a fresh chunk was downloaded, while cleanup still removed the old entry (`apps/web/src/lib/local-search/cache.ts:23-35,79-145`); stale chunks were being revalidated and swapped in the background; ETag comparison added a rejection path that main did not have; body deadlines were total-body deadlines; rejected chunk loads were permanently memoized; and failed worker builds did not always dispose the worker (`apps/web/src/lib/local-search/engine.ts:144-146,579-666,819-823`). The existing production contract is visible at `https://api.nthumods.com/search/chunk/manifest` and `https://api.nthumods.com/search/chunk/11510`.

## Design decisions

- `set` and `setText` now report whether persistence succeeded (`apps/web/src/lib/local-search/cache.ts:23-35,79-145`). Cleanup runs only after a confirmed write (`apps/web/src/lib/local-search/engine.ts:648-663,781-797`). A failed write is non-fatal: the new records remain in the in-memory index, while the previous IndexedDB entry is left untouched.
- Manifest failure and chunk failure use the previous cached semester when one exists. A successful manifest that does not contain the requested semester throws `MissingLocalSearchChunkError`; the adapter returns `handled: false`, allowing the existing remote tiers to answer. A failed local load is retryable later in the same session; concurrent loads still share one promise.
- Background revalidation, backoff, visibility listeners, and index swapping were removed. A stale chunk can remain served for the rest of that page session; the next page load asks the manifest again. This is an intentional known limit.
- Chunk and text downloads use streaming idle timeouts (`apps/web/src/lib/local-search/deadline.ts:89-151`): 15 seconds to connect/receive the first byte, 20 seconds between non-empty body chunks, and a 180-second absolute cap (`apps/web/src/lib/local-search/engine.ts:144-150,617-625,747-755`). The manifest has a 10-second total deadline (`engine.ts:144,565-572`) and the API fallback has a 15-second total deadline (`apps/web/src/lib/search-client.ts:65,257-263`). Caller-provided abort signals are combined with the internal timeout signal. Non-streaming bodies use the absolute cap.
- Chunk validation remains the main behavior: successful downloads are checked for HTTP success and manifest row count. ETag/hash verification was removed. The text ETag may still be used as a cache key when no manifest text hash exists, but it is not treated as integrity proof.
- Worker build failures dispose the failed index (`apps/web/src/lib/local-search/engine.ts:670-685`). Existing Algolia flags, tier order, and markup remain unchanged. Result counts keep their original format and show `common.loading` only while InstantSearch is `loading`/`stalled` with zero results (`apps/web/src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx:268-271`; `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/PlannerSearchContainer.tsx:152-155`).

## Changes

- `apps/web/src/lib/local-search/cache.ts`: report persistence success for IndexedDB and memory cache writes.
- `apps/web/src/lib/local-search/deadline.ts`: add total and streaming JSON deadline helpers with timer cleanup and caller-signal propagation.
- `apps/web/src/lib/local-search/engine.ts`: simplify load lifecycle, implement safe replacement/fallback, use the timeout budgets, remove revalidation machinery and ETag rejection, retry failed loads, and dispose failed workers.
- `apps/web/src/lib/local-search/client.ts`: map a missing manifest semester to `handled: false`.
- `apps/web/src/lib/search-client.ts`: set API fallback timeout to 15 seconds.
- `apps/web/src/lib/local-search/local-search.test.ts`: cover failed persistence, missing semesters, retry/deduplication, worker disposal, streaming progress/idle/caller abort, and the specified timeout budgets; remove tests for deleted revalidation and integrity machinery.
- `apps/web/src/lib/local-search/integration.test.ts`: update the real search-chunk integration expectation for retryable failed loads.
- Existing course/planner result-count changes remain limited to the loading-count behavior; no dictionary, dependency, or visual-style change was added.
- No production write, commit, push, install, or branch switch was performed.

## Commands and results

Baseline before this round:

- `bun run --cwd apps/web type-check`: failed with the two pre-existing diagnostics `apps/web/src/features/dining/useDining.ts:20` (`dining` missing from generated API types) and `apps/web/worker.ts:842` (`CacheStorage.default` does not exist).
- `bun --no-env-file test src` from `apps/web`: `260 pass, 2 skip, 0 fail`, `1,091 expect()` calls across `262 tests`.
- The prior WIP code diff against `7bcee1bc` was `852 insertions, 76 deletions` across 8 code/test files.

Final validation:

- `bun --no-env-file test src/lib/local-search/local-search.test.ts`: `31 pass, 0 fail`, `139 expect()` calls.
- `bun --no-env-file test src/lib/local-search/integration.test.ts`: `8 pass, 0 fail`, `67 expect()` calls. The printed upstream failures are intentional synthetic fixtures in that test.
- Required `bun --no-env-file test src`, run three times after the final formatting pass: each run was `258 pass, 2 skip, 0 fail`, `1,074 expect()` calls across `260 tests`.
- `bun run --cwd apps/web type-check`: still only the same two baseline diagnostics; no changed-file diagnostic appeared.
- `bun run --cwd apps/web build`: passed; Vite transformed `7,262 modules`, completed in about 41 seconds, and generated the PWA service worker. Existing Browserslist, Tailwind `@variants`, PDF.js `eval`, and large-chunk warnings remain.
- `bunx prettier --check` on the five changed implementation/test files: passed.
- Scoped `bunx eslint` on those five files: blocked before linting because the junctioned dependency checkout cannot resolve `@typescript-eslint/recommended` from `packages/eslint-config/index.js`.
- `git diff --check`: passed.
- Code/test diff after the formatting pass: `838 insertions, 139 deletions` across 9 task-owned code/test files, versus the prior-WIP `852 insertions, 76 deletions`. Production implementation additions changed from 388 to 386 lines; the main reduction is the local-search engine diff, from 314 to 217 changed lines, while the new 154-line helper and required streaming/retry regression coverage remain. `git diff origin/main --stat` is not a valid whole-branch comparison here because `origin/main` advanced during the task from `7bcee1bc` to `7dad50a9` and includes an unrelated module feature; the scoped comparison above uses the immutable task-start base.

Live and browser verification:

- Read-only `GET https://api.nthumods.com/search/chunk/manifest`: HTTP `200`, `2,565` bytes. The live entry for semester `11510` reports `3,486` rows and `maxUpdatedAt` `2026-10-07T11:23:11.503-07:00`.
- Read-only `GET https://api.nthumods.com/search/chunk/11510`: HTTP `200`, `2,814,465` bytes. No POST, PUT, or DELETE request was sent to production, Supabase, or GitHub.
- Started `bun run --cwd apps/web dev -- --port 5188 --strictPort`, waited 30 seconds after the first compile, and verified `GET http://localhost:5188/en/courses` returned HTTP `200` with the Vite root shell. Chrome loaded real course results at 390x844; the unauthenticated planner route rendered its real create-planner dialog. The server was stopped and port `5188` was verified free.
- Captured full-height 390x844 branch screenshots for `/en/courses` and `/en/student/planner`, plus temporary origin-equivalent captures with only the new result-count expressions disabled. Visual comparison showed unchanged surrounding headings, gutters, spacing, rows, navigation, and planner dialog. Temporary screenshot and browser-profile directories were deleted.

## Unverified and open questions

- The repository-wide type-check cannot be green until the two pre-existing diagnostics are fixed. Scoped ESLint cannot run until the shared `@typescript-eslint/recommended` config is available.
- The browser pass was unauthenticated, so it did not verify signed-in planner data or an interactive planner course-picker search. It verified the public course page and the actual unauthenticated planner landing state.
- No production deployment or Xcode/browser production session was performed. The stale-session behavior is intentionally documented above: refresh/revalidation happens on the next page load, not in the current session.
- Changes remain uncommitted on `fix/local-search-robustness`.
