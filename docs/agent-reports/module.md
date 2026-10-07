# Module cleanup report

## Final contract

- A module is identified by the normalized department and course number, joined as `department:course`; semester and class are not part of the key (`apps/web/src/lib/modules.ts:146-180`).
- Rows for one key are split by normalized Chinese title variant. The conservative rename merge requires exactly two variants with equal credits, at least two semesters each, non-overlapping adjacent known-semester ranges, a shared three-character title stem, and no conflicting sequence suffix (`apps/web/src/lib/modules.ts:364-409`).
- The recorded read-only data measurement was 57,214 rows from semesters `10810`–`11510`, 10,093 department/course keys, and 6,084 keys appearing in more than one semester. The live CS 1355 GET used for this check returned 22 rows.
- Detail aggregation, history aggregation, instructor summaries, and search-result grouping remain pure logic in `apps/web/src/lib/modules.ts:412-724`; the three module pages and `CourseDetailsContainer` retain their existing rendered output.

## Term availability

- `getTermAvailability` considers each term from the first recorded academic year through the newest known semester (`apps/web/src/lib/module-availability.ts:44-78`).
- A term is `stopped` when it was offered before but not in either of its two most recent possible years. Otherwise, one offering is `once`, all possible years are `every_year`, at least two-thirds are `most_years`, and the remainder are `some_years`; absent terms are `never` (`apps/web/src/lib/module-availability.ts:80-96`).
- The only change to this current helper is explicit `localeCompare` sorting for Sonar reliability; valid numeric semester IDs keep the same order.

## Data path and optional SQL

- The detail page directly queries Supabase `courses`, filtering by department and course, with a full offering select (`apps/web/src/lib/modules.ts:566-581`). Course details use a smaller history select through the same table (`apps/web/src/lib/modules.ts:584-601`; `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx:166-178`).
- Search calls the existing `search_courses(keyword)` RPC, selects only the fields needed for grouping, orders newest semester first, and limits the response to 500 rows (`apps/web/src/lib/modules.ts:604-724`; `packages/database/indexes/courses.sql:11-29`). The cap can omit later course rows, semesters, or modules, so broad search is not exhaustive.
- The optional equality index is `packages/database/indexes/module_courses.sql:2`; it was not applied to production.

## Changes

- Removed abandoned academic-year helpers, compact-slot helpers, offering-pattern and next-offering code, their private support types, and their tests. `modules.ts` is 728 lines and `modules.test.ts` is 213 lines, down from 965 and 392.
- Kept all production consumers used by the module detail/search pages and `CourseDetailsContainer`; internal-only helpers/constants/types are no longer exported. Removed the unused React import from the detail page without changing JSX output.
- Removed unreferenced `course.module` dictionary keys from both languages; their key trees remain identical. No protected UI component or class name was changed.

## Verification

- Baseline `bun run --cwd apps/web type-check`: exit 1 with the pre-existing errors at `src/features/dining/useDining.ts:20` and `worker.ts:856`.
- Baseline `bun test src` from `apps/web`: 265 passed, 2 skipped, 0 failed, 1,074 expectations across 267 tests.
- `bun test src/lib/modules.test.ts src/lib/module-availability.test.ts`: 16 passed, 0 failed, 33 expectations.
- Required env-free `bun test src`: `.env` and `.env.local` were temporarily renamed and restored; 254 passed, 2 skipped, 0 failed, 1,060 expectations across 256 tests.
- `bun run --cwd apps/web build`: passed; 7,259 modules transformed. Existing Browserslist, Tailwind `@variants`, PDF `eval`, dynamic-import, and large-chunk warnings remain.
- `bunx tsc --noEmit -p apps/web --noUnusedLocals --noUnusedParameters 2>&1 | rg "courses/module|lib/modules"`: no matching diagnostics. Full type-check still has only the two baseline errors above.
- Prettier check and `git diff --check` passed. Changed-file ESLint was inconclusive because the installed shared config cannot resolve `@typescript-eslint/recommended`.
- Sonar was fetched from the requested [quality gate](https://sonarcloud.io/api/qualitygates/project_status?projectKey=nthumodifications_courseweb&pullRequest=924), [issues](https://sonarcloud.io/api/issues/search?componentKeys=nthumodifications_courseweb&pullRequest=924&resolved=false&ps=100), and [duplication](https://sonarcloud.io/api/measures/component_tree?component=nthumodifications_courseweb&pullRequest=924&metricKeys=new_duplicated_lines,new_lines&qualifiers=FIL&ps=30) endpoints. Before these local edits, the gate was `ERROR` only because the two critical availability sort findings raised reliability to 4 over the threshold of 1; duplication was 0 for module-related files (7 lines in unrelated `worker.ts`). The local comparator fix has not been reanalyzed because this worktree was not pushed.
- Read-only live verification used port 5183: both module route URLs returned HTTP 200 and 9,653-byte Vite shells; a direct Supabase `courses` GET for CS 1355 returned HTTP 200 and 22 rows. No production write or `search_courses` RPC call was made.

## Not done / maintainer questions

- No 390px browser rendering or authenticated browser acceptance run was performed; the page markup and layout were intentionally untouched.
- The department/course identity remains a heuristic, not a registrar-backed identity or explicit cross-listing relation.
- The 500-row search cap and optional index need maintainer decisions; no migration, deployment, commit, or push was performed.
