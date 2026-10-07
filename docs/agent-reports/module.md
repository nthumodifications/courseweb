# Module page report

## Scope and data evidence

The existing feature is the module route `/:lang/courses/module/:moduleKey`, alongside the single-offering route `/:lang/courses/:courseId` (`apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx:649-861`, `apps/web/src/router.tsx:214-215`). The module key remains the normalized `department:course` pair, not a registrar identity. The source query is the public Supabase `courses` table through `apps/web/src/lib/modules.ts:702-731`; the detail summary uses the smaller history select rather than fetching all offering columns.

The read-only data study recorded 57,214 rows across semesters `10810` through `11510`, 10,093 department/course keys in the earlier snapshot, and 6,084 keys appearing in more than one semester. The live examples that matter for this UI are:

- `CS 1355`: 22 offering rows, all 15 recorded semesters, one selected title.
- `PE 2050`: 766 rows, eight recorded semesters, 54 title variants; it remains a selectable variant history rather than one merged semantic course.
- `CHE 5170`: a stopped history used to verify the muted stopped state.

This is still a heuristic grouping. A canonical registrar course identity or explicit rename/cross-listing relation would be needed before treating every same-number history as authoritative. No production write, SQL migration, or data-sync operation was performed.

## Design round 2

The prior implementation had consistent gutters but presented one row per academic year, gave the prediction equal weight to secondary facts, and placed the PE 2050 dot incorrectly in the variant render. This pass keeps the existing Supabase query, title selection, conservative rename logic, and prediction logic, but changes the visual and interaction contract:

- The header now reads as an answer-first block: mono course key, Chinese title, quieter English title, and one metadata line (`3 學分 · 15 個學期 · 108–115`). The variant picker is a compact `@courseweb/ui` select above the hero (`page.tsx:352-396`).
- The hero is a statement, not a label/value card. Running histories show the pattern headline plus an accent next semester and dashed `推測`/`Inferred` tag; stopped histories show `{semester} 之後未再開課`; irregular histories show `開課時間不固定` and the last offering (`page.tsx:156-207`).
- The history is a strict CSS grid, not a table: terms are rows, continuous academic years are columns, offered dots are 44px-hit-area buttons, counts appear inside multi-section dots, missing cells are hollow rings, and predictions are dashed rings (`page.tsx:210-345`). The year range includes a new predicted year and scrolls its own container to the newest columns when it exceeds ten years.
- Desktop uses a full-width header followed by a sticky left hero/matrix and right instructor/offering column (`page.tsx:799-850`). Mobile keeps the header, answer, and matrix above the first scroll boundary at 390px.
- Instructor summaries are pure logic sorted by distinct semesters taught, with the latest semester shown. The UI shows six chips, expands with `+N`, and filters offering rows when a chip is tapped (`apps/web/src/lib/modules.ts:521-569`, `page.tsx:398-474`).
- Offering rows are newest-first, grouped by semester with sticky small headers. The latest three semester groups render initially; older groups stay behind `顯示全部 15 個學期`. Each row is a single link containing section, instructor, time/venue, optional language/capacity, and a chevron (`page.tsx:477-647`). Matrix buttons open the older group when needed, scroll to it, and highlight it.
- The course-detail summary is now one native info-row link: `歷年開課` / `Course history`, eight miniature dots, the same pattern label, and a chevron. It is not a bordered card and uses the shared miniature component (`apps/web/src/components/Courses/ModuleHistoryMiniature.tsx:1-25`, `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:417-443`).
- Loading skeletons mirror the header, hero, matrix, chips, and offering rows (`page.tsx:100-137`). Hollow and dashed rings use semantic tokens and remained visible in the captured dark screenshots. Motion is limited to existing transitions and reduced-motion variants.
- New and changed copy is in the matching English/Traditional Chinese dictionaries (`apps/web/src/dictionaries/en.json:276-336`, `apps/web/src/dictionaries/zh.json:276-336`). The module-specific obsolete label/value and history-card keys were removed; the final leaf-key comparison is symmetric.

## Changes

- Reworked `apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx` into the answer-first matrix, instructor chips, grouped offering list, responsive desktop split, loading skeleton, and accessible interactions.
- Added `getModuleAcademicYears`, `getModuleInstructorSummaries`, and `getRecentSemesterSlots` to `apps/web/src/lib/modules.ts:502-596`.
- Added pure-logic coverage for continuous year ranges, instructor ranking, and hollow recent detail slots in `apps/web/src/lib/modules.test.ts:134-180`.
- Added `ModuleHistoryMiniature` and changed the course detail summary in `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:417-443`.
- Updated both dictionaries and removed unused module/detail keys.
- Replaced the old 40-image screenshot set with 16 non-blank PNGs in `docs/agent-reports/module-screens/`: CS, PE 2050 variant, stopped CHE 5170, and course detail; each has 390/1280 captures in zh/light and en/dark.

## Validation

All commands were run from this worktree. No dependency install or dependency mutation was run.

Baseline before editing:

- `bun run --cwd apps/web type-check` — exit 1 with 8 pre-existing diagnostics in `Forms/GenericIssueFormDialog.tsx`, `Forms/IssueFormDialog.tsx`, `features/dining/useDining.ts`, and `worker.ts`.
- `bun test src/lib/modules.test.ts` from `apps/web` — 15 passed, 0 failed, 27 expect calls.
- `bun test --cwd apps/web` — 242 passed, 2 skipped, 0 failed, 1,026 expect calls across 244 tests; expected synthetic local-search error logs were emitted.

After editing:

- `bun test src/lib/modules.test.ts` — 17 passed, 0 failed, 30 expect calls.
- `bun test --cwd apps/web` — 244 passed, 2 skipped, 0 failed, 1,029 expect calls across 246 tests.
- `bun run --cwd apps/web type-check` — still the same 8 diagnostics listed above; no changed-file diagnostic was added.
- `bun run --cwd apps/web build` — passed; 7,255 modules transformed. Existing Browserslist, Tailwind deprecation, PDF eval, and large-chunk warnings remain.
- `bunx prettier --write` was limited to the touched frontend files; the final `bunx prettier --check` and `git diff --check` passed.
- The required scoped `bunx eslint src/lib/modules.ts src/lib/modules.test.ts 'src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx' src/components/Courses/ModuleHistoryMiniature.tsx src/components/CourseDetails/CourseDetailsContainer.tsx` could not start because the installed shared config references missing `@typescript-eslint/recommended`.
- `bun run design-lint` exits 1 because of unrelated existing findings in search, library, grades, venue, campus-map, and UI files. It reports zero findings in the changed module page, module helpers/tests, course-detail files, or the screenshot-only report. No design baseline was edited.
- The English/Chinese dictionary leaf check reported equal trees with zero asymmetric keys (`1,689` leaves in each language after the final singular-semester key update).
- `git diff --check` passed.

Real-data and browser verification:

- Started `bun run --cwd apps/web dev -- --port 5183 --strictPort`, then stopped it before restarting with a process-local API URL override for the detail route. The checked-in `apps/web/.env.development` points at unavailable `http://localhost:5001`; the override was `VITE_COURSEWEB_API_URL=http://localhost:5183/__api` and changed no repository file.
- Read-only curl checks returned `module_cs=200 bytes=9669`, `module_pe=200 bytes=9669`, and `detail_proxy=200 bytes=4302` for `http://localhost:5183/__api/course/11510CS%20%20135501/syllabus`.
- Playwright loaded live CS 1355, PE 2050 `重量訓練`, stopped CHE 5170, and CS 1355 detail data. It verified the 390px and 1280px layouts, dark/light theme contrast, the PE dot under the fall column, accessible offered-cell names such as `108 上學期, 2 個班`, matrix click-to-list scrolling/highlighting, the variant select, and the detail summary row. The final screenshot directory contains exactly 16 files, all with non-zero sizes.
- No POST, PUT, DELETE, production SQL, Supabase mutation, or GitHub write was made.

## Unverified and open questions

- Formal keyboard-only and screen-reader testing was not performed; Playwright accessibility snapshots and the matrix interaction were checked.
- The existing repository type-check remains non-clean and the shared ESLint config cannot start until its missing installed dependency is repaired; neither was changed for this feature.
- The public course data can change, and the proposed composite module index in `packages/database/indexes/module_courses.sql` still needs maintainer review/application.
- The department/course heuristic still needs a registrar-backed identity or explicit cross-listing/rename relation if the page is to make canonical-course claims.

## Round 3

### Maintainer requests and design decisions

The history visualization is now one reusable year-group strip (`apps/web/src/components/Courses/ModuleHistoryStrip.tsx:13-121`) used by the module page (`apps/web/src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx:672-710`) and the course-detail summary (`apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:417-449`). It groups academic years oldest-to-newest, keeps terms in `1`, `2`, `3` order, prints the term digit inside each dot, uses filled dots for offered terms, hollow rings for absent terms, dashed rings for predictions, and places section counts in superscripts. Offered cells remain buttons with 44px height and accessible semester/count names. Eight-year strips fit the 390px viewport; longer strips scroll to the newest groups (`apps/web/src/lib/modules.ts:570-616`).

The compact detail strip intentionally uses the same year-group component rather than a second dot language. The detail summary is the only visual change left on the existing course-detail page. I restored an inherited unrelated shell-gutter edit in `courses/[courseId]/page.tsx`, and `courses/page.tsx` has no diff versus `origin/main`; the remaining `git diff origin/main` for the detail path is the allowed history-summary replacement.

The new search page is `/:lang/courses/modules` (`apps/web/src/app/[lang]/(mods-pages)/courses/modules/page.tsx`, registered at `apps/web/src/router.tsx:220-230`). It copies the course-search input/list row spacing and loading/empty/error treatment. It keeps `q` in the URL, debounces by 250ms, passes React Query’s abort signal to Supabase, caches by query, shows example chips for an empty query, and returns one row per module/title variant. The RPC call uses the existing `search_courses(keyword)` function (`packages/database/indexes/courses.sql:11-29`), selects only `raw_id, semester, department, course, name_zh, name_en, credits, teacher_zh, teacher_en`, orders newest first, and caps the response at 500 rows (`apps/web/src/lib/modules.ts:835-952`). Client grouping reuses the existing title-variant and rename logic; ranking is exact normalized code first, then latest semester (`apps/web/src/lib/modules.ts:873-933`). No API route or SQL change was added. The module page has the additive `搜尋其他課程` / `Search other courses` entry point, and worker bot metadata plus sitemap entries were added (`apps/web/worker.ts:468-478`, `apps/web/worker.ts:691-717`, `apps/web/worker.ts:934-942`).

The existing course search page was not given a new control. If maintainers later want a cross-semester toggle there, it can reuse `searchModules` and `q`/module-result grouping from the new route while leaving the current Algolia semester-filter behavior as the default.

### Round 3 validation

All commands below ran in this worktree. No `bun install`, dependency mutation, commit, push, stash, production write, SQL migration, or data-sync command was run.

- Baseline before Round 3 edits: `bun run --cwd apps/web type-check` exited 1 with the same 8 diagnostics in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `features/dining/useDining.ts`, and `worker.ts`; the env-loaded focused module suite was `17 pass, 0 fail, 30 expect()` calls.
- After Round 3: `bun test apps/web/src/lib/modules.test.ts` — `19 pass, 0 fail, 34 expect()` calls. This includes academic-year grouping and exact-code/module-result ranking tests (`apps/web/src/lib/modules.test.ts:196-233`, `310-325`).
- `bun test --cwd apps/web` — `246 pass, 2 skip, 0 fail, 1,033 expect()` calls across 248 tests. The existing synthetic local-search failures were logged by tests but did not fail the suite.
- `bun run --cwd apps/web type-check` — still exactly the baseline 8 diagnostics; no changed-file diagnostic was added.
- `bun run --cwd apps/web build` — passed; 7,257 modules transformed. Existing Browserslist, Tailwind `@variants`, PDF `eval`, and large-chunk warnings remain.
- Targeted `bunx eslint src/lib/modules.ts src/lib/modules.test.ts src/components/Courses/ModuleHistoryStrip.tsx src/components/Courses/ModuleHistoryMiniature.tsx src/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page.tsx src/app/[lang]/(mods-pages)/courses/modules/page.tsx src/components/CourseDetails/CourseDetailsContainer.tsx src/router.tsx worker.ts` from `apps/web` could not start because the installed shared config references missing `@typescript-eslint/recommended`; this is an environment/config limitation, not a changed-file lint result.
- `bunx prettier --check` on every touched TS/TSX/JSON/worker file — passed. `git diff --check` — passed.
- `node tools/check-dictionary-keys.mjs` — passed: English and Traditional Chinese trees match at 1,744 keys. New Chinese copy uses Taiwan Traditional Chinese (`平台` terminology where applicable).
- `bun run design-lint` exits 1 because of unrelated baseline findings in `AiSearchBox`, library, grades, venue, campus-map, local-search tests, and `packages/ui`. It reports no new finding in the Round 3 files after replacing non-vocabulary spacing and synthetic `font-semibold` in the new strip.

### Real-data, route, and visual verification

- `GET http://localhost:5183/zh/courses/module/CS%3A1355` and `GET http://localhost:5183/zh/courses/modules?q=CS%201355` returned the Vite SPA shell with HTTP 200 and 8,149 bytes. The live module/search screenshots loaded real Supabase rows for CS 1355, PE 2050, and stopped CHE 5170; the query screenshot rendered two module results, and the no-result screenshot rendered the translated empty state.
- `GET https://api.nthumods.com/course/11510CS%20%20135501/syllabus` returned HTTP 200/3,854 bytes. The process-local Vite proxy at `GET http://localhost:5183/__api/course/11510CS%20%20135501/syllabus` returned the same HTTP 200/3,854-byte response. No write method was used.
- Read-only Supabase table GET measurements using the configured public browser key returned approximate name-field matches of `微積分: 683`, `程式: 747`, and `教師: 16` with `Prefer: count=exact`. These are conservative table GET probes, not replacements for the RPC’s PGroonga semantics. The 500-row cap therefore bounds broad queries and can omit at least the tail of the first two approximate sets; the UI makes no claim that a broad query is exhaustive. If exhaustive broad search becomes required, propose a reviewed SQL function such as `search_module_summaries(keyword text, limit int)` that returns the narrow grouped module projection directly; it was not applied.
- Chrome captured exactly 14 non-zero 390x844 PNGs in `docs/agent-reports/module-screens/`: zh/light and en/dark for CS 1355, PE 2050, stopped CHE 5170, modules search with results, modules search with no results, the existing course search page, and the course detail page with the modal closed. The detail captures show the compact history-summary line. The first compile was awaited before capture; screenshots were visually inspected for non-blank content.
- The dev server used port 5183 only and was stopped after capture. The course-detail screenshots used a process-local `VITE_COURSEWEB_API_URL=http://localhost:5183/__api` override; no env file was edited.

### Unverified and open questions

- The installed ESLint shared config must be repaired before a true changed-file ESLint pass can run.
- Type-check remains repository-noisy for the 8 pre-existing diagnostics listed above.
- The 500-row client cap is intentionally bounded but can omit broad-query modules; maintainers should decide whether the proposed grouped SQL RPC is worth adding when API deployment is available.
- The module identity remains the existing department/course heuristic plus conservative title-variant rename logic, not a registrar-backed identity or cross-listing relation.
- Formal keyboard-only and screen-reader testing was not performed; accessible names, focus rings, term digits, state styling, URL query behavior, live data, and the offered-cell jump behavior were checked through the rendered browser flow and pure tests.
