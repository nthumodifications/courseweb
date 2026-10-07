# Module page report

## Data study (completed before implementation)

The request came from [#915](https://github.com/nthumodifications/courseweb/issues/915), with [#303](https://github.com/nthumodifications/courseweb/issues/303) folded into its offering-history section. The existing course detail route is `/:lang/courses/:courseId` (`apps/web/src/router.tsx:214-215`), and the detail container currently loads one offering through the API (`apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:115-151`).

The source of truth is Supabase Postgres. The browser has a typed Supabase client in `apps/web/src/config/supabase.ts:1-30`; the API also reads `courses` by `raw_id` in `services/api/src/course.ts`. The shared minimal course projection is defined in `packages/shared/src/types/courses.ts:12-33`. Search is a separate Algolia/local-search projection, so it is not a suitable source for a cross-semester join.

I queried the production Supabase REST endpoint with the browser anon credentials from `apps/web/.env` using read-only GETs. The live `courses` table returned **57,214 rows across 15 semesters**: `10810, 10820, 10910, 10920, 11010, 11020, 11110, 11120, 11210, 11220, 11310, 11320, 11410, 11420, 11510`. There are **10,093 distinct `department + course` keys**; 6,084 occur in more than one semester and 4,009 occur in only one.

### Key choice and measured error cases

The module key is the normalized pair `department + course`, excluding semester and class. The row fields are used rather than slicing `raw_id`, because department padding varies in actual IDs (for example, `11510CS  135501`). The class field is a section identifier: `class = "0"` occurs 40,941 times, while numbered sections occur thousands of times; `CS 1355` has 22 rows across the 15 semesters, including multiple classes in the same semester.

This key is useful but intentionally heuristic:

- Stable example: `CS 1355` has 22 offerings in all 15 recorded semesters, always titled `計算機程式設計一 / Introduction to Programming (I)`.
- Same-key reuse: 1,915 of 10,093 keys have more than one observed title. `PE 2050` has 766 rows across eight semesters and 54 distinct title pairs, so the module page must not claim that every same-key row is semantically identical. `LANG 1030` has 441 rows across all 15 semesters and separate reading/listening titles. These are retained as one module because the data has no stronger stable identifier, with the title and per-offering rows left visible.
- Same-title, different-key cases: `線性代數` appears in 93 rows under 37 keys, and `大學中文` appears in 611 rows under 19 keys. This is consistent with cross-listing, renamed/department-specific offerings, or generic course titles. The implementation does **not** merge by name, because doing so would combine unrelated courses.

The resulting contract is therefore “all recorded offerings for one department/course key”, not a registrar-verified canonical course identity. The page labels its next-semester result as a heuristic and says when no clear pattern exists.

### Joinable historical data and cost

`courses` already stores the requested offering-level fields: semester, class, instructors, times, venues, language, credits, capacity, and enrolled (`apps/web/src/types/supabase.ts:654-730`). `course_scores`, `course_syllabus`, `course_dates`, and `course_enroll_stats` are separate `raw_id`-keyed relations (`apps/web/src/types/supabase.ts:371-409`, `544-644`). Production currently has 10,545 score rows and 29,058 syllabus rows; `course_dates` and `course_enroll_stats` returned zero public rows in the read-only check. Scores/syllabi can join later by each offering's `raw_id`, but the module page does not issue N+1 historical queries.

The current database SQL has separate semester/department/course indexes (`packages/database/indexes/courses.sql:1-9`) but no composite module-key index. The implementation uses one direct Supabase query filtered by both `department` and `course`, and adds a maintainer-applied composite index SQL file at `packages/database/indexes/module_courses.sql`. It does not scan all semesters in the browser or call the frozen API Worker. Until the SQL is applied, the same filtered query remains correct but may be slower.

## Design decisions

* Use `/courses/module/:moduleKey`, where the URL key is `DEPARTMENT:COURSE` (for example `CS:1355`), alongside the existing offering route.
* Read the module directly from Supabase so the page works with the currently deployed API. The query returns every matching offering ordered by semester and class.
* Show an academic-year x fall/spring/summer grid, then a horizontally scrollable offering table for instructors, time/venue, language, credits, capacity/enrolled, and links to every offering page.
* Derive “likely offered next” only from recorded semester IDs. A regular pattern is shown as a guess; irregular data renders “no clear pattern”.
* Keep all user-visible copy in the English and Traditional Chinese dictionaries.

## Changes

* Added `apps/web/src/lib/modules.ts:22-247`, which derives/parses the `DEPARTMENT:COURSE` key, performs one Supabase equality query, preserves every offering, groups the history by semester, and implements the tested pattern/next-offering heuristic.
* Added `apps/web/src/lib/modules.test.ts:34-94` with trimmed live `CS 1355` rows and tests for key derivation, section-preserving aggregation, term patterns, regular predictions, and irregular histories.
* Added `/courses/module/:moduleKey` to `apps/web/src/router.tsx:27-30,217-218` and the mobile-first page in `apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx:118-400`. It includes the academic-year grid, historical names/credits, heuristic status, instructor/time/venue/language/capacity/enrolment table, and links for every offering.
* Added a direct course-detail summary and module link in `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:162-169,400-417`.
* Added matching English/Traditional Chinese dictionary trees in `apps/web/src/dictionaries/en.json:276-329` and `apps/web/src/dictionaries/zh.json:276-329`.
* Added the maintainer-applied composite index proposal in `packages/database/indexes/module_courses.sql:1-2`. No production SQL was applied.

## Validation

### Baseline before edits

* `bun run --cwd apps/web type-check` — failed with 9 pre-existing errors in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `features/dining/useDining.ts`, `lib/local-search/flexsearch-index.ts`, and `worker.ts`.
* `bun test --cwd apps/web` — 213 passed, 2 skipped, 2 failed, 2 errors. The failures/errors were the existing missing `flexsearch` package and synthetic local-search worker failure.

### After edits

* `bun test src/lib/modules.test.ts` from `apps/web` — **5 pass, 0 fail, 12 expect() calls**.
* `bun test --cwd apps/web` — **218 pass, 2 skip, 2 fail, 2 errors, 891 expect() calls** across 222 tests. The only failures/errors are the existing missing `flexsearch` dependency and synthetic local-search worker failure; the added module tests pass.
* `bun run --cwd apps/web type-check` — still **9 errors**, exactly in the same pre-existing files listed above; no module-related diagnostic was added.
* `bun run --cwd apps/web build` — failed at the existing unresolved `flexsearch` import in `src/lib/local-search/flexsearch-index.ts` after transforming 5,628 modules. Tailwind/Browserslist warnings were also emitted.
* `bunx eslint src/lib/modules.ts src/lib/modules.test.ts 'src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx' src/router.tsx src/components/CourseDetails/CourseDetailsContainer.tsx` — could not start because the installed shared config references missing `@typescript-eslint/recommended`.
* `bunx prettier --check src/lib/modules.ts src/lib/modules.test.ts 'src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx'` — passed for all new files. `git diff --check` passed.
* Dictionary leaf-key check — English and Chinese each had 1,687 leaves, with no keys present in only one tree.
* `bun run --cwd apps/web dev -- --port 5183 --strictPort`, followed by `curl.exe -sS -o NUL -w "module_page_status=%{http_code} bytes=%{size_download}\n" "http://localhost:5183/en/courses/module/CS%3A1355"` and the transformed route source — page HTTP 200 (9,653 bytes), source HTTP 200 (73,922 bytes). The read-only production Supabase query for `department=CS&course=1355` returned HTTP 200 and 22 offerings across all 15 measured semesters, including the fields rendered by the page. The dev server was stopped afterwards.

## Unverified and open questions

* The composite index SQL has not been applied to production; applying Supabase SQL requires a maintainer.
* Historical score/syllabus display is not included because it would need a deliberate batched join/RPC contract and the public enrolment snapshot table is empty in the measured dataset.
* Production `api.nthumods.com` course GETs responded with HTTP 200 but empty bodies for the tested IDs, while `/related` returned 500; the stated frozen Worker deployment means the module page intentionally does not depend on that route.
* No interactive headless browser was available in this environment, so a visual 390px screenshot/layout inspection was not performed. The verification covered Vite route/source transformation, the real REST data response, responsive overflow classes in the source, and unit behavior.
* The maintainer should decide whether a canonical registrar course identity or explicit cross-listing relation is available before treating the department/course heuristic as authoritative.

## Review round 1

### Findings and measured decisions

The review found that a department/course number is not always a course identity. I repeated the read-only Supabase study on 2026-10-06 against the public `courses` REST table (`https://cmzdlrqfpuktcczvsobs.supabase.co/rest/v1/courses`) and got 57,214 rows. The observed semester IDs are exactly `10810, 10820, 10910, 10920, 11010, 11020, 11110, 11120, 11210, 11220, 11310, 11320, 11410, 11420, 11510`; the fourth digit counts are `1:33,491` and `2:23,723`, with no `3`/summer rows and no invalid five-digit IDs. `packages/shared/src/constants/semester.ts:1-107` is the site semester list, and `apps/web/src/helpers/semester.ts:1-6` renders the fourth digit as `-1`/`-2`.

The current normalized `department + course` grouping has 11,887 keys, 3,304 keys with more than one raw Chinese/English title pair, and 3,025 keys with more than one normalized Chinese-title variant. NFKC normalization, whitespace collapse, punctuation-width mapping, and trailing editorial-punctuation removal collapsed 319 keys. The earlier section's 10,093-key/1,915-title snapshot is retained as historical evidence from the previous run; these counts are a newer live snapshot/query grouping and should not be mixed when comparing totals.

For rename safety, 22,937 title pairs have disjoint semesters and equal credit sets, but this is not a safe automatic rule: the live examples include rotating GE concert topics, partner/university topics, and special-topic sequences under one number. Only 361 pairs were adjacent known-semester handoffs with at least two semesters on each side, across 52 keys; only 30 of those keys had exactly two variants. The implementation therefore merges only the conservative subset in `apps/web/src/lib/modules.ts:327-415`: exactly two variants, equal credits, no semester overlap, adjacent known semester IDs, at least two semesters per side, a shared three-character title stem, and no conflicting sequence suffix (`一`/`二`, `A`/`B`, etc.). Ambiguous titles remain separate and are listed as “other titles under this number”. This deliberately prefers a visible false-positive warning over mixing seminar/topic histories. A measured rename-like example is `GEC 1203`, where `心理學與現代生活` ends at `11110` and `探索心智與行為:當代心理學` starts at `11120`, with equal credits; `JMU 1035` (`舞蹈一`/`舞蹈二`) and the `PE 2050`/`LANG 1030` reuse cases remain separate.

Before/after spot checks against the same REST table:

* Stable `CS 1355`: 22 rows, 15 semesters, one title before and one selected variant after; sections remain separate within each semester.
* Topic-reuse `PE 2050`: 766 rows, eight semesters, 54 titles before; after, the picker lists variants by most recent semester count and the grid/prediction/instructors/table use only the selected title.
* Reading/listening reuse `LANG 1030`: 441 rows, 15 semesters, two overlapping titles before; after, reading and listening stay as two variants rather than one mixed history.
* Rename-like and special-topic cases now have explicit pure-logic coverage in `apps/web/src/lib/modules.test.ts:72-174`; sequential special-topic titles are not merged.

### Prediction and page behavior

`inferNextOffering` now anchors its expected-slot scan at `lastSemester.id` (`11510`) from the shared semester list, while also handling test/live rows newer than that boundary. It requires a regular year step for every observed term, predicts strictly after the newest known/observed semester, reports `kind: "stopped"` after two missed expected slots with the first missed semester, and returns no guess for a new one-row or irregular history. The tests cover a running fall-only course, a stopped fall-only course, every-semester, alternating-year, one-offering, irregular, and summer histories (`apps/web/src/lib/modules.test.ts:126-174`). The page renders the stopped result rather than a stale future guess (`apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx:482-512`).

The module page now derives grid columns from the selected variant's actual terms, so the current live data does not show an empty summer column. It has localized Helmet titles and explicit invalid-key, loading, empty, and network-error states (`apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx:309-397,442-475`). The title picker uses `?title=` and defaults to the most recently offered variant when absent or unknown. All new copy is in matching English/Traditional Chinese dictionary trees (`apps/web/src/dictionaries/en.json:291-333`, `apps/web/src/dictionaries/zh.json:291-333`).

The course-detail summary remains outside the modal (`apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:164-178`), uses a separate seven-day React Query cache, and does not gate the detail render on success. Its Supabase query now selects only `semester, department, course, name_zh, name_en, credits` through `MODULE_HISTORY_SELECT` (`apps/web/src/lib/modules.ts:614-629`), then links to the viewed title variant (`CourseDetailsContainer.tsx:412-427`). The full offering query remains available only to the module page and is cached for 24 hours there as well (`page.tsx:317-331`).

### Review-round validation

* Baseline before this review: `bun run --cwd apps/web type-check` produced the existing diagnostics in the Forms, dining, and worker files (the prior report records 9; this rerun printed 8 because the current checkout did not emit the older flexsearch type diagnostic). `bun test --cwd apps/web` was 218 passed, 2 skipped, 2 failed, 2 errors across 222 tests, matching the known pre-existing flexsearch/synthetic-worker baseline.
* `bun test src/lib/modules.test.ts` from `apps/web`: **15 passed, 0 failed, 27 expect() calls**.
* `bun test --cwd apps/web`: **242 passed, 2 skipped, 0 failed, 1,026 expect() calls** across 244 tests. The suite logs expected synthetic local-search errors while exercising error handling, but exits successfully.
* `bun run --cwd apps/web type-check`: 8 existing diagnostics again, with no module/detail diagnostic added.
* `bun run --cwd apps/web build`: **passed**, 7,254 modules transformed; only existing Browserslist, Tailwind deprecation, PDF eval, and large-chunk warnings were emitted.
* `bunx eslint src/lib/modules.ts src/lib/modules.test.ts 'src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx' src/router.tsx src/components/CourseDetails/CourseDetailsContainer.tsx`: could not start because the installed shared config references missing `@typescript-eslint/recommended`.
* `bunx prettier --write ...` was run from `apps/web` on every touched frontend file; the subsequent `bunx prettier --check ...` passed. `git diff --check` passed, and the English/Chinese dictionary leaf check reported 1,693 leaves each with zero asymmetric keys.
* Started `bun run --cwd apps/web dev -- --port 5183 --strictPort`. Read-only requests to `/en/courses/module/CS%3A1355`, `/en/courses/module/PE%3A2050?title=重量訓練`, and `/zh/courses/module/INVALID` each returned HTTP 200 and 9,653 bytes; the transformed module source returned HTTP 200 and contained the variant-picker and stopped-course dictionary references. Direct read-only Supabase requests returned CS 1355 = 22 rows/15 semesters/1 title, PE 2050 = 766/8/54, and LANG 1030 = 441/15/2. The dev server was stopped and port 5183 is no longer listening.

### Remaining limitations and maintainer questions

* No interactive browser/headless screenshot was available, so a visual 390px inspection remains unverified. The page uses mobile-first responsive overflow and was route/source checked, but visual spacing should be checked by a maintainer.
* The conservative rename rule may miss a real rename with no shared title stem; a canonical registrar identity or explicit rename/cross-listing relation would allow the heuristic to be relaxed safely.
* The composite index proposal at `packages/database/indexes/module_courses.sql:1-2` was not applied to production. No production SQL or write request was made.
* Should the maintainer prefer exposing an explicit “possible rename” badge for the 22,937 disjoint/equal-credit candidates, rather than keeping those titles only in the other-title list?
