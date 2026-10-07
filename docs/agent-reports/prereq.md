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
