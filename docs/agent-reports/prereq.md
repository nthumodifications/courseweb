# Course prerequisite parser (#37)

## Scope and issue context

I read `CONTRIBUTING.md` and `README.md` before editing. I also ran `gh issue view 37 --comments`. The issue discussion describes prerequisite information as free text and points to NTHU's official 擋修 list, so the implementation is deliberately conservative and keeps the source text beside every interpretation.

No commit, push, dependency installation, production write, or API route change was made.

## What the real data contains

I queried the Supabase `courses` table read-only using the frontend environment configuration. The four semesters inspected were `11510`, `11420`, `11410`, and `11320`:

| Semester |   Rows |
| -------- | -----: |
| 11510    |  3,165 |
| 11420    |  3,306 |
| 11410    |  3,122 |
| 11320    |  3,459 |
| Total    | 13,052 |

The typed course row is in `packages/shared/src/types/supabase.ts:628-656`. The prerequisite-like fields and observed values were:

| Field                          | Non-empty rows | Distinct values |
| ------------------------------ | -------------: | --------------: |
| `prerequisites`                |          1,582 |             465 |
| `restrictions`                 |          7,911 |           1,134 |
| `note`                         |          7,558 |           2,670 |
| Union of the three text fields |              — |           4,264 |

The scraper shows where these values originate: colored note fragments become `restrictions`, `cross_discipline`, specialization arrays, and `note` at `tools/data-sync/src/scrapers.ts:273-327`; the prerequisite cell is read at `tools/data-sync/src/scrapers.ts:375-406`. `compulsory_for`, `elective_for`, `first_specialization`, `second_specialization`, and `cross_discipline` are also present in the row (`packages/shared/src/types/supabase.ts:633-652`). They are curriculum/category metadata rather than consistently worded prerequisite conditions, so they remain existing course metadata and are not guessed into prerequisite nodes. Department/year limits mostly occur in `restrictions` and in 擋修對象 text; there is no separate first-year restriction column in the course row.

The public API returns the same course fields through `GET /course/:courseId/syllabus`; its Supabase selection is visible at `services/api/src/course.ts:102-123`. A real read-only request for `https://api.nthumods.com/course/11510TSED702300/syllabus` returned HTTP 200 and the live course `數量方法二`, including its prerequisite/note/restriction text.

### Pattern inventory

The following counts are non-exclusive indicators among distinct values, not mutually exclusive classes. They were counted separately for each field using the live four-semester corpus.

| Field           | Course name | Course number | Any/or | All/and | Co-requisite | Grade | Department/year | Consent | HTML | English |
| --------------- | ----------: | ------------: | -----: | ------: | -----------: | ----: | --------------: | ------: | ---: | ------: |
| `prerequisites` |         215 |             0 |    103 |     375 |            0 |   294 |              36 |       0 |    0 |      13 |
| `restrictions`  |           0 |           128 |      0 |       0 |            0 |     1 |             762 |       3 |    0 |     187 |
| `note`          |         136 |            27 |    254 |      29 |           11 |    27 |             351 |     569 |    4 |     738 |

The data includes the official scraped format, for example `擋修對象 : ...` followed by `先修科目 : ...上述條件任選一科/一定要有`, concatenated Chinese course names with grade suffixes such as `-成績需C-以上`, `未修過`, `曾修`, English fragments such as `CEFR`, `instructor approval`, department/year limits, and opaque leftovers. The sample fixture contains 84 real records (76 distinct texts) across 11 categories, including 8 manually selected garbage/opaque examples; opaque text was not treated as a successful parse.

The de-duplicated prerequisite corpus is checked into `packages/shared/src/utils/__fixtures__/prerequisite-corpus.json` with its four source semesters. The corresponding four-semester, de-duplicated course-resolution catalog is `packages/shared/src/utils/__fixtures__/prerequisite-course-catalog.json` (755 course candidates). The table-driven real examples are in `packages/shared/src/utils/__fixtures__/prerequisite-samples.json`.

Current top unparsed remainders in the prerequisite corpus include `三-成績需D以上` (7), `上上日本語能力試驗N4級通過` (5), `以上` (5), `C-以上` (4), `上` (4), `選讀` (4), `-以上` (3), `數位` (3), `CEFR A2通過` (3), concatenated basic-subject exemption/AP-test text (3), and `特論` (3). These remain visible as verbatim unparsed nodes.

## Official 擋修 list

The issue links to `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.6/JH626002.php`. A direct read-only request returned HTTP 200, but the body was only `session is interrupted!` plus a redirect script to `/ccxp/INQUIRE/`. The root inquiry page requires account/password/captcha. I therefore could not obtain an anonymous machine-readable official list. From this environment it is not a better public-client source than the per-course Supabase text. If the maintainer can provide an approved authenticated export or public endpoint, it should be compared as an authoritative source before replacing or overriding scraped course text.

## Design and implementation

### Pure parser

`packages/shared/src/utils/prerequisites.ts:1-52` defines the structured result: `allOf`, `anyOf`, course references with raw text, resolved course keys, ambiguity, grade threshold and `mustNotHaveTaken`, `corequisite`, consent, restriction, and `unparsed` nodes. `parsePrerequisites` is exported through `packages/shared/src/utils/index.ts:1-13`.

The parser:

- normalizes HTML breaks/entities/full-width ASCII for matching while retaining `rawText`;
- recognizes the official 擋修 wording and emits the audience as a restriction;
- resolves course number/raw ID before names (`packages/shared/src/utils/prerequisites.ts:155-228`), then prefers an exact name in the current department and finally a unique global name;
- keeps all matching sections when a course number maps to multiple real course keys and sets `ambiguous: true` rather than claiming one match;
- detects only high-confidence co-requisite, instructor-consent, restriction, any-of, and all-of forms (`:315-459`); and
- computes `unparsedRemainder` and coverage without deleting or rewriting unknown text (`:462-518`).

Coverage is measured per distinct `prerequisites` string, not per row: the focused test reported 267 full (57.4%), 198 partial (42.6%), and 0 untouched (0.0%) across 465 values. The coverage test and the real sample table are at `packages/shared/src/utils/prerequisites.test.ts:160-229`.

### Course detail UI

`apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:108-247` renders nested all-of/one-of groups, linked course chips, ambiguity labels, co-requisite/consent/restriction flags, unparsed remainder, and planned-course badges. The course catalog is fetched read-only for the displayed semester at `:280-296`; no API route or server data was added.

The resolver uses the existing timetable storage only. `CourseLocalStorage` is a semester-to-raw-course-ID map at `apps/web/src/hooks/contexts/useUserTimetable.tsx:135-196`, so the UI marks planned courses but does not claim that a student has already completed a course. Grades currently store names rather than reliable course keys, so a taken-course marker would be ambiguous and was not added.

Every structured source has an immediately adjacent expandable original-text disclosure (`CourseDetailsContainer.tsx:667-725`). If the catalog cannot be loaded or no structured node is found, the prerequisite field uses the existing sanitized HTML rendering. Existing sidebar note/restriction/course-program metadata remains intact. New user-visible strings are present in both dictionary trees at `apps/web/src/dictionaries/en.json:236-250` and `apps/web/src/dictionaries/zh.json:236-250`; the leaf key trees remain identical.

## Verification

Baseline was run before the implementation:

- `bun run --cwd apps/web type-check` — failed on pre-existing diagnostics in the form dialogs (`errorData` unknown), dining API typing, local-search/flexsearch typing, and `worker.ts` cache typing; no prerequisite files were involved.
- `bun run --cwd apps/web test` — 213 passed, 2 skipped, 2 failed, 2 errors, 879 expectations across 217 tests. The failures/errors were existing local-search/flexsearch-related noise.

After the implementation:

- `bun test packages/shared/src/utils/prerequisites.test.ts` — 94 passed, 0 failed, 192 expectations; corpus coverage was `267 full, 198 partial, 0 untouched (465 values)`.
- `bun run --cwd packages/shared type-check` — passed.
- `bun run --cwd apps/web type-check` — still failed only in unrelated existing locations: the two form dialogs, `src/features/dining/useDining.ts:20`, and `worker.ts:842`; no changed file was reported. The earlier baseline also reported the existing flexsearch declaration problem.
- `bun run --cwd apps/web test` — 227 passed, 2 skipped, 0 failed, 999 expectations across 229 tests; the run still printed the known synthetic local-search error logs. Because the baseline suite is noisy/flaky, this is reported as an after-run result, not as proof that unrelated tests were repaired.
- `bun run --cwd apps/web build` — passed in 3m13s and generated the service worker. It retained existing warnings about stale Browserslist data, deprecated Tailwind `@variants`, `pdfjs-dist` eval, and large chunks.
- Changed-file ESLint was attempted with `bunx eslint` from `packages/shared` and `apps/web`, but the repository's existing ESLint configuration references the unavailable `@typescript-eslint/recommended` config. No dependency was installed.
- `git diff --check` — passed. Dictionary leaf-key comparison passed (`en` and `zh` both had 1,700 leaves with identical key trees).

Real endpoint and development checks were read-only:

- `GET https://api.nthumods.com/course/11510TSED702300/syllabus` — HTTP 200 with live course data.
- Started the frontend with `VITE_COURSEWEB_API_URL=http://localhost:5184/__api bun run --cwd apps/web dev -- --port 5184 --strictPort`, then stopped it after checking it.
- `GET http://localhost:5184/zh/courses/11510TSED702300` — HTTP 200, 8,149 bytes, with the app root present.
- `GET http://localhost:5184/__api/course/11510TSED702300/syllabus` — HTTP 200 with `數量方法二` and a non-empty prerequisite field.

## Unverified and open questions

- I did not run signed-in browser automation or inspect the actual rendered DOM at exactly 390px wide. The dev-server page/API curl checks passed, but a visual mobile check remains.
- The official CCXP 擋修 list could not be inspected without an authenticated session, so its format and authority relative to scraped text remain unverified.
- The implementation intentionally does not infer completed courses from the current name-only grade storage. The maintainer should decide whether a future stable course-history key can support a “completed” marker.
- The parser currently treats only high-confidence prerequisite-like notes as sources. The maintainer may want a future review of whether particular `no_extra_selection`, program mapping, or specialization metadata should be surfaced in the same block.
- No production deployment was attempted; the existing production API was only read. No new `services/api` route is required for this client-side/shared implementation.

## Round 2: generated prerequisite grammar

### Review findings and corpus grammar

The Round 1 parser searched the catalog for names inside the whole text. That made a catalog name such as `數學` match inside `工程數學`, and it allowed adjacent generated items to be swallowed into one course token. The Round 1 UI also fetched every course in the displayed semester before it could render the structured result; the four-semester evidence above shows why that exceeds Supabase's 1,000-row response limit.

The checked-in whole corpus is 465 distinct `prerequisites` values from semesters `11510`, `11420`, `11410`, and `11320` (`packages/shared/src/utils/__fixtures__/prerequisite-corpus.json:1-465`). Its generated variants are:

| Grammar part                | Observed variants and counts                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audience                    | `全校` 381; `藝設系` 30; `大學部` 28; `醫環系` 7; `材料系大學部` 4; `動機系` 3; `政經學院台北政經學院政治經濟碩士碩士班` 2; `數學系` 2; `公共政策與管理碩士專班` 1; `化工系大學部` 1; `台北政經學院政治經濟碩士` 1; `政經學院` 1; `政經學院台北政經學院政治經濟博士博士班` 1; `科管院EMBA亞太馬國境外專班` 1; `資工系` 1; `音樂系` 1 (all 465 have `擋修對象`). |
| Prerequisite label          | `先修科目` 465; `先修課程` 21 (the parser accepts both labels).                                                                                                                                                                                                                                                                                                 |
| Group terminator            | `上述條件一定要有` 379 occurrences; `上述條件任選一科` 119 occurrences. The total is 498 groups: 358 one-`一定要有`, 76 one-`任選一科`, and the remainder are repeated/mixed group shapes.                                                                                                                                                                      |
| Group connector             | `，而且` 33 occurrences across 31 entries: 29 entries use it once and 2 use it twice.                                                                                                                                                                                                                                                                           |
| Final terminator            | `，則不擋修。` 465.                                                                                                                                                                                                                                                                                                                                             |
| Explicit item markers       | `曾修` 266; `未修過` 174.                                                                                                                                                                                                                                                                                                                                       |
| Grade suffix                | 520 items: `C-` 365, `D` 105, `B-` 49, and `B` 1. The implementation also accepts `B+` and numeric scores with optional `分`/`%`.                                                                                                                                                                                                                               |
| Group shape                 | One group 434 entries; two groups 29; three groups 2.                                                                                                                                                                                                                                                                                                           |
| Whitespace/width/name cases | All 465 contain the generated newline/indentation between audience and label. The raw corpus includes full-width `Ａ` 63 times, `Ｂ` 59 times, `：` 36 times, and `，` 499 times. After item isolation, 142 item occurrences (22 unique names) contain parentheses; no isolated catalog item name contains `曾修` or `以上` in this corpus.                     |

The 84 hand-selected samples were re-checked from their text: the 32 generated prerequisite samples (`courseName`, `anyOf`, `allOf`, and `grade`) must parse fully; the 52 course-number, department/year, co-requisite, consent, English, HTML, and garbage samples remain untouched verbatim. The five reviewer examples are explicit tree tests in `packages/shared/src/utils/prerequisites.test.ts:139-323`.

### Round 2 design and changes

- `packages/shared/src/utils/prerequisites.ts:1-420` now recognizes only the generated `擋修對象`/`先修科目`/`先修課程` grammar. It tokenizes item boundaries from `曾修`, `未修過`, and `-成績需…以上`, preserves exact item names (including unresolved tests/exemptions), records `audience`, and represents multiple groups as an outer `allOf`. Free-form prerequisite text is one verbatim `unparsed` node; `restrictions` and `note` are not sent through this parser.
- Resolution happens on an isolated item name using exact width/whitespace-normalized equality. A name collision retains all matching offering IDs and records a preferred viewed-department offering only when it is unique; it never resolves a shorter catalog name inside a longer token. The one intrinsically ambiguous generated shape (`曾修 NAME` immediately followed by an unmarked grade item) uses an exact catalog-name tail only to identify that adjacent grade span; unresolved items remain chips rather than false matches.
- `apps/web/src/components/CourseDetails/PrerequisiteBlock.tsx:1-185` is the extracted renderer. It reuses the existing outline badges and flex-row/gap-2 rows, shows `Applies to`/`適用對象`, grade thresholds as `C- or above`/`C- 以上`, and a distinct not-taken message. Lookup failures leave plain chips; one exact viewed-department offering links to its detail, while collisions link to an exact-name course search without calling them parser ambiguity in the UI.
- `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:133-174,504-531` parses the prerequisite text immediately, queries only `.in("name_zh", names)`, selects five small columns plus semester, orders newest first, and limits the result to 100. React Query caches by the sorted name set; returned offerings are then used to reparse the isolated names and upgrade chips to links. The query is disabled for the light modal variant, while the modal still renders text-only chips. Existing sidebar rendering for `note` and `restrictions` remains verbatim at `CourseDetailsContainer.tsx:747-760`.
- `apps/web/src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx:1-54` server-renders all five corrected examples in both languages. `apps/web/src/dictionaries/en.json:239-248` and `zh.json:239-248` contain matching Traditional Chinese/English keys. The shared utility remains exported from `packages/shared/src/utils/index.ts:13`.

### Round 2 verification

Baseline before Round 2 edits:

- `bun run --cwd apps/web type-check` — failed with 9 pre-existing diagnostics in the two issue dialogs, `src/features/dining/useDining.ts`, and `worker.ts`; no prerequisite files were involved.
- `bun test packages/shared/src/utils/prerequisites.test.ts` — 93 passed, 1 failed, 192 expectations; the corpus test timed out/failed under the Round 1 whole-catalog substring scan.
- `bun run --cwd apps/web test` — 227 passed, 2 skipped, 0 failed, 999 expectations, with the known synthetic local-search error logs.

After Round 2 edits:

- `bun test packages/shared/src/utils/prerequisites.test.ts` — 95 passed, 0 failed, 667 expectations. Corpus proof: `465/465 full; 960 items; 0 remainder`; every entry's parsed item count equals its independent marker count. The tests include exact trees for all five reported examples, corrected sample expectations, full-width resolution, collision handling, no-substring matching, numeric/B+ variants, and marker-containing catalog names.
- `bun test apps/web/src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx` — 1 passed, 20 expectations. Resulting text (the same output is printed by the test):

  `SSR en example 1: Applies to: all students One of these 中級日語二 C- or above 高級日語二 C- or above 高級日語一 C- or above 日語會話二 C- or above 日本語能力試驗N3級通過 Must have taken`

  `SSR en example 2: Applies to: all students All of these One of these 計算機概論二 Must have taken 程式語言 Must have taken 資訊系統應用 Must have taken C語言 Must have taken 計算機概論 Must have taken One of these 工程數學 Must have taken 應用數學 Must have taken 工程數學一 Must have taken 應用數學一 Must have taken`

  `SSR en example 3: Applies to: all students All of these Not for students who have taken 現代社會與心理 Not for students who have taken 心理學與現代生活 Not for students who have taken 普通心理學 Not for students who have taken 心理學 Not for students who have taken 心理學(基本科目免修測試) Not for students who have taken 普通心理學一 Not for students who have taken 普通心理學二`

  `SSR en example 4: Applies to: all students One of these 大學中文 C- or above 基礎寫作 C- or above`

  `SSR en example 5: Applies to: all students One of these CEFR A1通過 C- or above 中級法語一 C- or above`

  `SSR zh example 1: 適用對象：全校學生 以下任一項 中級日語二 C- 以上 高級日語二 C- 以上 高級日語一 C- 以上 日語會話二 C- 以上 日本語能力試驗N3級通過 需曾修過`

  `SSR zh example 2: 適用對象：全校學生 以下皆須符合 以下任一項 計算機概論二 需曾修過 程式語言 需曾修過 資訊系統應用 需曾修過 C語言 需曾修過 計算機概論 需曾修過 以下任一項 工程數學 需曾修過 應用數學 需曾修過 工程數學一 需曾修過 應用數學一 需曾修過`

  `SSR zh example 3: 適用對象：全校學生 以下皆須符合 修過此課程的學生不適用 現代社會與心理 修過此課程的學生不適用 心理學與現代生活 修過此課程的學生不適用 普通心理學 修過此課程的學生不適用 心理學 修過此課程的學生不適用 心理學(基本科目免修測試) 修過此課程的學生不適用 普通心理學一 修過此課程的學生不適用 普通心理學二`

  `SSR zh example 4: 適用對象：全校學生 以下任一項 大學中文 C- 以上 基礎寫作 C- 以上`

  `SSR zh example 5: 適用對象：全校學生 以下任一項 CEFR A1通過 C- 以上 中級法語一 C- 以上`

- `bun run --cwd packages/shared type-check` — passed. `bun run --cwd apps/web type-check` — still failed only with the same 9 unrelated baseline diagnostics.
- `bun run --cwd apps/web test` — 228 passed, 2 skipped, 0 failed, 1,019 expectations; the synthetic local-search error logs remain expected test output.
- `bun run --cwd apps/web build` — passed in 1m53s; the existing Browserslist, Tailwind `@variants`, pdfjs `eval`, and large-chunk warnings remain.
- `bunx prettier --check` over all touched source/dictionary files — passed. `git diff --check` — passed. Focused `bunx eslint` was attempted from both `packages/shared` and `apps/web` and is blocked by the existing missing `@typescript-eslint/recommended` config; no dependency installation was performed.
- Real read-only verification: `GET https://api.nthumods.com/course/11510TSED702300/syllabus` via the local proxy returned HTTP 200 with `數量方法二` and the generated prerequisite `數量方法一-成績需B-以上...`; `GET http://localhost:5184/zh/courses/11510TSED702300` returned HTTP 200 and 9,653 bytes. The server was stopped and port 5184 was confirmed free afterward.

### Final continuation verification after the interrupted run

- Initial state was rechecked with `git status`, `git diff --stat`, `git log origin/main..HEAD --oneline`, and this report. `git log origin/main..HEAD` was empty; all task changes remain uncommitted.
- `bun test packages/shared/src/utils/prerequisites.test.ts` — 95 passed, 0 failed, 667 expectations; `465/465 full`, 960 items, zero remainder, and every parsed item count matched the marker count.
- `bun test apps/web/src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx` — 1 passed, 20 expectations; all five examples rendered in both languages. `bun run --cwd packages/shared type-check` passed.
- `bun run --cwd apps/web test` — 228 passed, 2 skipped, 0 failed, 1,019 expectations. The existing synthetic local-search error logs remain expected test output.
- `bun run --cwd apps/web build` — passed in 34.45 seconds. Existing Browserslist, Tailwind `@variants`, pdfjs `eval`, and large-chunk warnings remain.
- `bun run --cwd apps/web type-check` — failed with the same unrelated diagnostics in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `src/features/dining/useDining.ts`, and `worker.ts`; no changed file was reported.
- Focused `bunx eslint` from `packages/shared` and `apps/web` was attempted for changed TypeScript files and remained blocked by the existing missing `@typescript-eslint/recommended` config. No dependency installation was performed.
- `bunx prettier --write`/`--check` passed for the parser, tests, extracted component, dictionaries, and report. The existing container source formatting was restored after the formatter run so unrelated JSX does not appear in the diff. `git diff --check` passed.
- Read-only live verification used `VITE_COURSEWEB_API_URL=http://localhost:5184/__api` with `bun run --cwd apps/web dev -- --port 5184 --strictPort`. The live course `11510CS  210401` rendered at a 390px CSS viewport with no console errors after the first compile wait; `適用對象：全校學生`, grouped prerequisite chips, and `查看原始文字` were present. The recorded Supabase request was bounded and returned 200: `courses?select=raw_id,department,course,name_zh,name_en,semester&name_zh=in.(數位邏輯設計,邏輯設計,邏輯設計實驗)&order=semester.desc&limit=100`. A block-disabled same-viewport comparison preserved the regions above and below the new block. Vite was stopped and port 5184 was confirmed free.

### Round 2 unverified and maintainer questions

- I did not run signed-in browser automation. I did run a real 390px CSS-viewport browser check on `11510CS  210401`: the page was nonblank, the structured block rendered, and its live offering lookup upgraded chips to links. I also captured a same-viewport block-disabled comparison; the regions above and below the new block were unchanged. The browser console had no errors on that course; the first test course exposed the existing missing `canvas` dev dependency when its PDF viewer chunk was requested.
- The live check used read-only production API/Supabase data through the local Vite proxy and recorded the exact React Query request: `courses?select=raw_id,department,course,name_zh,name_en,semester&name_zh=in.(數位邏輯設計,邏輯設計,邏輯設計實驗)&order=semester.desc&limit=100` returned HTTP 200. It did not exercise signed-in behavior.
- The public CCXP official list remains inaccessible without authentication, as recorded above. This Round 2 parser intentionally treats the scraped `prerequisites` grammar as the source of truth and does not modify production data.
- No commit, push, dependency installation, deployment, or production write was performed.

## Round 3 dependency graph implementation

### Findings and evidence

- The existing course-detail section is at `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:493-516`; its heading, `gap-2` section wrapper, original-text disclosure, and surrounding related-course table were left in place. The existing programme-tag chip contract is visible in `apps/web/src/components/Courses/CourseTagsList.tsx:8-22`.
- The parser already exposes normalized matching and parsed nodes through `packages/shared/src/utils/prerequisites.ts:34-39,421-518`. The new graph model is exported from `packages/shared/src/utils/prerequisite-graph.ts:9-161` and re-exported by `packages/shared/src/utils/index.ts:19`.
- A read-only live Supabase query for semesters `11510` and `11420`, selecting `raw_id, semester, department, course, name_zh, name_en, prerequisites` and filtering non-empty prerequisites, returned 334 rows for 11510 and 455 for 11420 (789 total). It did not hit the 1000-row cap.
- Real page/API reads through the local Vite proxy returned HTTP 200 for `http://localhost:5184/zh/courses/11510CS%20%20210401` and the syllabus JSON at `http://localhost:5184/__api/course/11510CS%20%20210401/syllabus`. The live rows showed `11510CS  210401` as `硬體設計與實驗` and `11510CHE 211001` as `工程數學一`; the latter resolved 9 unlocks.

### Design decisions and changes

- `buildPrerequisiteGraph(course, parsed, rows)` keeps the parser tree as flattened all/any `Group[]`, resolves exact normalized `name_zh` matches with same-department priority and newest-semester fallback, preserves unresolved nodes as plain nodes, and derives one-level unlocks with department/course de-duplication and self-exclusion (`packages/shared/src/utils/prerequisite-graph.ts:83-161`). Tests cover any/all, grade, not-taken, unresolved, department collisions, newest rows, unlock sorting, de-duplication, and self-exclusion (`packages/shared/src/utils/prerequisite-graph.test.ts:33-127`).
- `PrerequisiteGraph.tsx` renders the three lanes, responsive 560px container breakpoint, node links, not-taken dashed styling/edges, junction pills, SVG Bézier edges with arrowheads, ARIA sentence, and `+N` expansion (`apps/web/src/components/CourseDetails/PrerequisiteGraph.tsx:74-390`). The `ResizeObserver` is on the graph container (`:234`), not the viewport; links remain keyboard reachable.
- `PrerequisiteBlock.tsx` retains the existing audience line and passes the graph data into the new renderer (`apps/web/src/components/CourseDetails/PrerequisiteBlock.tsx:9-44`). The original disclosure remains immediately below it in the unchanged course-detail call site.
- The course-detail query is lazy (`import("@/config/supabase")` inside the query function), limited to the viewed semester and immediately preceding semester, capped at 1000, cached for 24 hours, disabled for modal views, and set to `retry: false` (`apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:60-177`). Loading/error states pass an empty row set so requirements still render without links or unlocks.
- English and Traditional Chinese lane, junction, ARIA, and expansion strings were added while removing the old chip-group-only keys; both trees remain identical (`apps/web/src/dictionaries/en.json:289-307`, `apps/web/src/dictionaries/zh.json:289-307`).

### Commands and results

Baseline before edits:

- `bun run --cwd apps/web type-check` — failed with only the existing `src/features/dining/useDining.ts:20` `dining` property error and `worker.ts:842` `CacheStorage.default` error.
- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1047 expectations.
- `bun --no-env-file test src` from `packages/shared` — 108 passed, 0 failed, 690 expectations.

After edits:

- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1057 expectations. Existing synthetic local-search errors were printed as expected test output.
- `bun --no-env-file test src` from `packages/shared` — 112 passed, 0 failed, 695 expectations.
- `bun run type-check` from `packages/shared` — passed.
- `bun run --cwd apps/web type-check` — still reports only the same two baseline errors above; no changed file is reported.
- `bun run --cwd apps/web build` — passed. Existing warnings remain for stale Browserslist data, deprecated Tailwind `@variants`, `pdfjs-dist` eval, the statically imported Supabase module preventing a separate dynamic chunk, and large chunks.
- Focused lint was attempted with `bunx eslint` for changed files from both owning workspaces. It is blocked before linting because the existing config references unavailable `@typescript-eslint/recommended`; no dependency was installed.
- `bunx prettier --write` over changed source/dictionary/test files — passed. `git diff --check` — passed.

### Browser and visual verification

- Started exactly with `bun run --cwd apps/web dev -- --port 5184 --strictPort`, set `VITE_COURSEWEB_API_URL=http://localhost:5184/__api` in the ignored development-local env, waited for the first compile, and used real production-backed GET data only.
- Captured and visually inspected full-height screenshots at 390x844 and 1280x800 for CS 210401 and CHE 211001. The browser reported `horizontalOverflow: false` for every target. CS produced 5 SVG paths; CHE produced 22 paths with the collapsed `+3` node. Clicking `+3` expanded the list in place, produced 24 paths, and still had no horizontal overflow.
- Screenshot paths:
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-1280.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-390.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-1280.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-390-expanded.png`
- For the accepted no-second-worktree comparison, I temporarily disabled only the graph block behind a local constant, captured `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390-baseline.png`, compared the regions above/below the block with the graph screenshot, restored the final code, and reran the checks. The heading, raw section/table placement, row styling, and mobile navigation outside the new block remained unchanged.
- The Vite server was stopped, port 5184 was confirmed free, the temporary browser profile `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-chrome-profile` was deleted, and `apps/web/.env.development.local` was deleted. Screenshots were intentionally left in the system temp directory and are not tracked.

### Unverified and maintainer questions

- The exact `origin/main` page was not checked out in a second worktree; the required graph-disabled same-page comparison was used instead. It is a visual region comparison, not a pixel-diff against a separately rendered `origin/main` checkout.
- I did not run signed-in automation, deploy, or any production write. Supabase/API access was read-only. I also did not instrument browser console collection; the visual/DOM checks confirmed nonblank pages, ARIA labels, SVG paths, and no horizontal overflow.
- The mandated non-empty-prerequisite query cannot resolve a prerequisite name whose course rows are absent from those two semesters or have empty prerequisite text. Should the maintainer later want broader link coverage, approve a separate bounded catalog query rather than silently widening this one.
- Please confirm whether the open left bracket around any-of items matches the reviewer’s intended visual bracket; all other graph styling follows the specified node, lane, gutter, and edge contract.

## Round 4 prerequisite graph redraw (current implementation)

Round 3’s junction-pill/per-item-edge description above is superseded by this section. The parser, resolver, ARIA sentence, and existing unit-test assertions were left unchanged; this round changes only the graph drawing contract requested by the reviewer.

### Findings and design decisions

- The current course-detail integration remains at `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:493-516`; the heading, audience line, original-text disclosure, and related-course table were not restyled. `PrerequisiteBlock.tsx:9,29-45` retains the existing `gap-2` section and passes the graph data through.
- Group edge definitions are now one per requirement group, with a single optional anchor-to-unlock-group edge (`apps/web/src/components/CourseDetails/PrerequisiteGraph.tsx:191-205`). All-not-taken groups alone make their container and edge dashed (`:196-198,280-297`); a single all-of item remains a standalone dashed chip.
- Any-of and multi-item all-of groups use one `relative w-fit max-w-full rounded-lg border border-border p-2` container with a background-overlapping legend and `flex flex-wrap gap-2` chips (`:280-303`). The unlock lane uses the same container/legend contract and keeps `+N` inside it (`:364-397`). There is no lane caption, junction pill, or anchor caption.
- Wide paths use the exact box/anchor refs and a capped requirement track; narrow paths use bottom-to-top curves with `gap-y-8` (`:349-350`). The SVG has no clipping container, uses cubic paths, one marker at the target, 1.5px border-colour strokes, and dashed strokes only for not-taken groups (`:312-340`). The explicit 35% requirement track is below the requested 60% maximum and reserves enough width for unlock chips in the actual 700px course-detail column.
- Duplicate unlock names are counted by normalized display name and receive the existing raw-ID department code only when duplicated. The parser graph shape is unchanged; the code handles both spaced IDs such as `11510CHE 211001` and compact IDs such as `11510BMES211200` (`:133-134,166-180,386-393`).
- New visible labels are in both dictionaries: `Any one of`/`任一即可`, `All of`/`都需要`, `Must not have taken`/`不可修過`, and `Unlocks`/`修完可修` (`apps/web/src/dictionaries/en.json:296-299`, `apps/web/src/dictionaries/zh.json:296-299`). The key trees contain the same 1,713 keys.

### Commands and results

Baseline before the redraw:

- `bun run --cwd apps/web type-check` — failed with the two pre-existing errors only: `src/features/dining/useDining.ts:20` (`dining` property) and `worker.ts:842` (`CacheStorage.default`).
- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1,057 expectations.
- `bun test src` from `packages/shared` — 112 passed, 0 failed, 695 expectations.

After the redraw, with the temporary comparison flag removed and the graph rendered unconditionally as before:

- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1,057 expectations. Existing synthetic local-search error output and SSR `useLayoutEffect` warnings remain expected repository output.
- `bun test src` from `packages/shared` — 112 passed, 0 failed, 695 expectations.
- `bun run --cwd packages/shared type-check` — passed.
- `bun run --cwd apps/web type-check` — still reports only the same two baseline errors above; no changed file is reported.
- `bun run --cwd apps/web build` — passed (`✓ built in 29.70s`). Existing Browserslist, deprecated Tailwind `@variants`, pdfjs `eval`, Supabase chunking, and large-chunk warnings remain.
- `bunx eslint src/components/CourseDetails/PrerequisiteGraph.tsx` — blocked before linting because the existing config cannot resolve `@typescript-eslint/recommended`; no dependency was installed.
- `bunx prettier --write` on the graph passed; the final dictionary parity check reported identical 1,713-key trees; `git diff --check` passed. The final graph was formatted after the last mechanical helper adjustment.

### Real-data browser verification

- Started `bun run --cwd apps/web dev -- --port 5184 --strictPort` with `VITE_COURSEWEB_API_URL=http://localhost:5184/__api` in the temporary ignored env file, waited 30 seconds after the first compile, and used only read-only GETs. Both course pages returned HTTP 200 with 9,653-byte HTML; `GET http://localhost:5184/__api/course/11510CS%20%20210401/syllabus` returned HTTP 200 with 5,081 bytes.
- Final screenshots were captured at the `#prerequesites` section and opened for visual inspection:
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-1280.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-390.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-1280.png`
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-390-expanded.png`
  - The graph-disabled comparison was `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390-baseline.png`.
- DOM measurements on the final branch: CS 390px graph `374x168`, 2 edges; CS 1280px graph `700x144`, 2 edges; CHE 390px graph `374x622`, 3 edges; CHE 1280px graph `700x576`, 3 edges. All four had `scrollWidth === innerWidth`; no sideways scroll or clipped group border was observed. The CHE `+3` interaction changed 3 visible unlocks plus `+3` to the full list, removed the button, kept exactly 3 edges, and retained no horizontal overflow.
- The screenshots show no per-item curves, no sibling-to-sibling unlock edges, no separate lane captions, and department prefixes `BMES`/`CHE` on the duplicated `工程數學二` unlocks. Vite was stopped, port 5184 had no listener, the temporary env file was deleted, and all temporary Chrome profiles/scripts were deleted. Screenshot PNGs were intentionally left in the system temp directory.

### Unverified and maintainer questions

- `origin/main` was not checked out in a second worktree. The required same-page comparison used a temporary local constant that disabled only the new graph; the heading, audience line, original-text disclosure, related-course table, and mobile navigation outside the block remained structurally unchanged. This was visual comparison, not a pixel-diff against a separately rendered `origin/main` page.
- No signed-in automation, deployment, or production write was performed. The live API/Supabase reads were unauthenticated/read-only. The bounded semester query still cannot resolve prerequisite names absent from those two semesters or rows with empty prerequisite text; broader catalog coverage would need a separate maintainer-approved query.
- The repository’s pre-existing web type-check and ESLint configuration blockers remain for the maintainer to resolve; neither reports a changed-file diagnostic.

## Round 5 narrow-layout connector correction

### Findings and design decisions

- The existing graph integration remains in `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:494-507`, with the unchanged course-detail heading, original-text disclosure, and related-course table surrounding `PrerequisiteBlock`. The narrow-only rendering change is contained in `apps/web/src/components/CourseDetails/PrerequisiteGraph.tsx:381-413`.
- At narrow widths, consecutive requirement groups now insert the existing `prerequisite_and` dictionary label (`apps/web/src/components/CourseDetails/PrerequisiteGraph.tsx:390-398`; `apps/web/src/dictionaries/en.json:295`; `apps/web/src/dictionaries/zh.json:295`) using the same `gap-2` group stack. The label is small, muted, and left-aligned with the groups.
- Narrow mode now omits the graph SVG entirely (`PrerequisiteGraph.tsx:348-379`) and renders two 20px vertical SVG connector lanes (`:324-339`): requirements-to-anchor and, when present, anchor-to-unlocks. The connector is a solid 1.5px border-colour line with a downward arrowhead, positioned at the measured anchor-chip centre (`:164, 215-232, 328`). Not-taken chips/boxes retain their own dashed styling; no narrow connector is dashed.
- Wide mode still uses the existing grid classes, lane gap, marker, and cubic path function (`PrerequisiteGraph.tsx:107-131, 348-385`). The new separator and narrow connectors are gated by `!wide`, so the accepted wide layout is not restyled.
- The SSR test now checks the rendered `and`/`而且` separator for the two-group example (`apps/web/src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx:69-76`) while retaining the exact accessibility-label assertions. No dependency was added or upgraded.

### Commands and results

Baseline before this round’s narrow change:

- `bun run --cwd apps/web type-check` — failed with the same two pre-existing diagnostics: `apps/web/src/features/dining/useDining.ts:20` (`dining` property missing) and `apps/web/worker.ts:842` (`CacheStorage.default` missing).
- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1,057 expectations.
- `bun test src` from `packages/shared` — 112 passed, 0 failed, 695 expectations.

After the final source was restored from the temporary screenshot-only edits:

- `bun --no-env-file test src` from `apps/web` — 239 passed, 2 skipped, 0 failed, 1,059 expectations. The campus-map mismatch summary, synthetic local-search error output, and SSR `useLayoutEffect` warnings are expected existing test output.
- `bun test src` from `packages/shared` — 112 passed, 0 failed, 695 expectations.
- `bun run --cwd packages/shared type-check` — passed.
- `bun run --cwd apps/web type-check` — still failed only with the two baseline diagnostics above; no changed-file diagnostic was reported.
- `bun run --cwd apps/web build` — passed (`✓ built in 38.86s`). Existing Browserslist, deprecated Tailwind `@variants`, pdfjs `eval`, Supabase chunking, and large-chunk warnings remain.
- `bunx eslint src/components/CourseDetails/PrerequisiteGraph.tsx src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx` — blocked before linting because the existing config cannot resolve `@typescript-eslint/recommended`; no dependency was installed.
- `bunx prettier --check src/components/CourseDetails/PrerequisiteGraph.tsx src/components/CourseDetails/PrerequisiteBlock.ssr.test.tsx src/dictionaries/en.json src/dictionaries/zh.json` — passed.
- The dictionary key-tree parity check reported 1,913 keys in each language and identical paths.
- `git diff --check` — passed. The worktree was left uncommitted; no commit, push, stash, or production write was performed.

### Real-data and visual verification

- Started `bun run --cwd apps/web dev -- --port 5184 --strictPort` with a temporary `apps/web/.env.development.local` containing `VITE_COURSEWEB_API_URL=http://localhost:5184/__api`; waited 30 seconds after the first request/compile and confirmed the app was nonblank. Both page GETs returned HTTP 200 with 9,653-byte HTML: `http://localhost:5184/zh/courses/11510CS%20%20210401` and `http://localhost:5184/zh/courses/11510CHE%20211001`. The read-only course API returned HTTP 200 for `GET http://localhost:5184/__api/course/11510CHE%20211001`; the first CS syllabus probe transiently returned 500 while the proxy was warming, and the retry returned HTTP 200 with course/syllabus data.
- Because headless Chrome’s direct post-load `scrollIntoView` capture rasterized a blank scrolled viewport, I captured real rendered full-page images, used the measured prerequisite heading offsets (CS narrow 1699, CHE narrow 1280, CS wide 1197, CHE wide 877), cropped the section viewport with ffmpeg, and opened all four final PNGs. Temporary telemetry and the temporary desktop help-dialog default were removed before the final checks.
- Final screenshot dimensions and paths:
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390-round5.png` — 390x844.
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-1280-round5.png` — 1280x800.
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-390-round5.png` — 390x844.
  - `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-che-211001-1280-round5.png` — 1280x800.
- Visual inspection showed `而且` between the stacked groups, no line crossing a chip, one short solid connector into the anchor, one short connector into the unlocks box, and retained dashed not-taken chips. The wide captures retain the accepted curved layout. The current CS mobile crop was compared with the graph-disabled baseline `C:\Users\chewt\AppData\Local\Temp\courseweb-prereq-cs-210401-390-baseline.png`; the heading, audience line, original-text disclosure, related-course table, row styling, and navigation outside the graph remained unchanged.
- Vite was stopped, port 5184 was confirmed free, the temporary env file was deleted, and all browser profile directories created under `%TEMP%` were deleted. The four final screenshot PNGs were intentionally left in `%TEMP%`.

### Unverified and maintainer questions

- This round did not check out `origin/main` in a second worktree; the comparison used the existing graph-disabled same-page baseline because the shared checkout cannot safely switch/stash. It is a visual surrounding-region comparison, not a pixel diff against a separately rendered `origin/main` checkout.
- No signed-in flow, deployment, or production write was attempted. API/browser checks were unauthenticated and read-only.
- The repository’s web type-check and ESLint configuration blockers remain maintainer-owned follow-up items.
