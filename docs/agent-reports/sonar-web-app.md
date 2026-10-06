# SonarCloud web-app pass

Date: 2026-10-06

## Scope

The source changes are limited to `apps/web/src/app/`. The report is the one intentional file outside that scope because it was an explicit deliverable. `SONAR_ISSUES.tsv` was preserved as an untracked helper. No dependency, generated, dictionary, lockfile, commit, push, or branch operation was performed.

The input inventory contained 591 open rows: 37 `BUG`, 1 `VULNERABILITY`, 2 `HOTSPOT`, and 551 code smells.

## Verification

| Check                                  | Baseline                                                                                     | Final                                                       | Result                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `bun run --cwd apps/web type-check`    | Exit 1; 9 TypeScript diagnostic lines across 5 affected files                                | Exit 1; the same 9 diagnostic lines across the same 5 files | No regression and no new diagnostic in a changed file             |
| `bun run --cwd apps/web test`          | Exit 1; 212 passed, 2 skipped, 2 failed, 2 unhandled errors, 878 `expect()` calls, 216 files | Exit 1; exactly the same counts                             | No regression                                                     |
| Changed-file ESLint from `apps/web`    | Not applicable                                                                               | Exit 0; no output                                           | Passed                                                            |
| `git diff --check -- apps/web/src/app` | Not applicable                                                                               | Exit 0; no whitespace errors                                | Passed; Git emitted only its usual LF/CRLF normalization warnings |

The five pre-existing typecheck files are `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `useDining.ts`, `flexsearch-index.ts`, and `worker.ts`; the first two each contribute three diagnostics, for nine total. The two test failures/errors are the existing missing `flexsearch` package and the synthetic local-search worker failure. The campus-map test also reports two unmatched identities, but that is informational output rather than a failed assertion.

The exact final lint command was:

```text
bunx eslint -- <all paths returned by git diff --name-only -- apps/web/src/app, made relative to apps/web>
```

## Rule disposition

| Rule                                                                                                                                                                                                                     | Issues fixed                                                                                   | Deferred / judged false-positive                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `typescript:S1082`                                                                                                                                                                                                       | All 19 bug rows                                                                                | —                                                                                               |
| `typescript:S2137`                                                                                                                                                                                                       | All 3 bug rows; renamed the three error-boundary functions                                     | —                                                                                               |
| `typescript:S2245`                                                                                                                                                                                                       | 1 vulnerability row; replaced the Grade Tracker ID fallback with Web Crypto                    | 2 error-message randomness hotspots judged false positives                                      |
| `typescript:S2871`                                                                                                                                                                                                       | All 5 bug rows                                                                                 | —                                                                                               |
| `typescript:S3923`                                                                                                                                                                                                       | 1 bug row                                                                                      | —                                                                                               |
| `typescript:S6848`                                                                                                                                                                                                       | All 20 non-native interactive-element rows                                                     | —                                                                                               |
| `typescript:S9383`                                                                                                                                                                                                       | All 9 promise-handling bug rows                                                                | —                                                                                               |
| `typescript:S1128`, `S3863`                                                                                                                                                                                              | Selected unused and duplicate imports in touched files                                         | Remaining inventory rows deferred to avoid an unsafe broad import-only sweep                    |
| `typescript:S1854`, `S6582`, `S6594`, `S7503`, `S7752`, `S7754`, `S7755`, `S7773`                                                                                                                                        | Selected mechanical, behavior-preserving occurrences in touched files                          | Remaining inventory rows deferred                                                               |
| `typescript:S1125`, `S1874`, `S2301`, `S4123`, `S4138`, `S4165`, `S4323`, `S4624`, `S6035`, `S6481`, `S6557`, `S6606`, `S6660`, `S6754`, `S6759`, `S6772`, `S6819`, `S6845`, `S7718`, `S7744`, `S7762`, `S7776`, `S7786` | No broad mechanical rewrite attempted; incidental safe cleanup was kept with the touched files | Deferred; no suppression or test deletion used                                                  |
| `typescript:S3358`                                                                                                                                                                                                       | —                                                                                              | Deferred nested ternaries; the inventory is broad and extraction would add behavior risk        |
| `typescript:S3776`                                                                                                                                                                                                       | —                                                                                              | Deferred cognitive-complexity refactors where extraction was not small and obviously equivalent |
| `typescript:S6478`                                                                                                                                                                                                       | —                                                                                              | Deferred nested component-definition refactors                                                  |
| `typescript:S6479`                                                                                                                                                                                                       | Stable `course.raw_id` keys used in the favourites and timetable course lists                  | Index keys remain where the data has no genuine stable unique ID                                |
| `typescript:S9382`                                                                                                                                                                                                       | —                                                                                              | Deferred awaits inside loops                                                                    |
| `typescript:S7756`                                                                                                                                                                                                       | —                                                                                              | Deferred `FileReader` to `Blob.text()` changes                                                  |

## Vulnerability, hotspot, and bug details

### S2245 vulnerability: Grade Tracker IDs

`student/grades/GradeTracker.tsx` used `Math.random()` when creating a new local grade entry ID. That is not suitable for an identifier that should remain collision-resistant. The implementation now uses `crypto.randomUUID()` when available and a `crypto.getRandomValues()` fallback, combined with the current timestamp. This preserves the local-storage data shape and ID semantics without relying on a predictable PRNG.

Exercise it by adding several course/semester entries in Grade Tracker, reloading the page, and confirming every newly created entry retains a distinct ID. The fallback branch needs a browser/test environment that does not expose `randomUUID` but does expose `getRandomValues`.

### S2245 hotspots: error-message selection

`[lang]/error.tsx` and the root `error.tsx` still use `Math.random()` to select harmless humorous error copy. The value never creates an identifier, token, authorization decision, URL, or other security-sensitive material; it only changes presentation text. These two hotspots are therefore false positives. Exercise them by rendering each error boundary repeatedly and observing that only the displayed message changes.

### S1082/S6848: keyboard support for existing mouse interactions

The affected clickable non-native elements now have an appropriate button/presentation role where needed, `tabIndex` where needed, and Enter/Space handling that calls the existing action. This covers `apps/AppItem`, bus details and bus rows, favourites courses, group members, sports-venue rows, the mobile quick-nav backdrop/drawer, planner course/grid/list rows, empty-folder rows, folder navigation and management rows, expandable planner filters, semester rows, and the time-selection grid cell. The mobile quick-nav retains Escape handling and event propagation behavior.

Exercise these changes with keyboard-only navigation: Tab to each formerly mouse-only row, activate it with Enter and Space, and verify the same navigation, selection, open/close, or drag/drop-adjacent action as a mouse click. For the time grid, hold/use Enter or Space through the same start/end selection sequence.

### S2871: deterministic alphabetical sort

The five default string sorts were changed to explicit `localeCompare` comparators in:

- `community/page.tsx`
- `courses/FavouritesCourseList.tsx` (both affected sorts)
- `group/[code]/page.tsx`
- `timetable/share/[shareId]/page.tsx`

This avoids JavaScript's default lexicographic coercion and makes the intended alphabetical ordering explicit. Exercise with values whose textual order differs from their default coercion order, then inspect the community, favourites, group, or shared-timetable result order.

### S3923: bus start index

`bus/[route]/[line]/page.tsx` had a conditional that returned `0` for both directions. It is now the equivalent constant `0`, removing the misleading dead condition without changing route behavior. Exercise both bus directions and confirm the same first-stop rendering.

### S2137: error-boundary function names

The three functions named `Error` in `[lang]/(mods-pages)/error.tsx`, `[lang]/error.tsx`, and `error.tsx` are now named `ErrorPage`. Their default exports and rendered content remain unchanged. Exercise each error boundary and confirm it still renders the same recovery UI.

### S9383: intentionally ignored or handled promises

The nine affected calls now explicitly express their existing fire-and-forget intent with `void`, or retain a rejection handler where one exists. The changes cover group-link clipboard copying, settings theme loading, planner folder/stat/course updates, planner settings loading, RxDB initialization, and semester loading. No API contract or sequencing change was introduced.

Exercise by copying a group link, changing the theme, opening/loading planner settings, creating or updating planner courses/folders/semesters, and loading the planner database. Confirm the existing UI updates remain unchanged and rejected operations do not become unhandled promise rejections.

## Other behavior-preserving cleanup

The touched files also received selected import consolidation/removal, numeric parsing (`Number.parseInt`/`Number.parseFloat`), optional chaining, `RegExp.exec`, `.at()`, `.some()`, `.flatMap()`, stable course keys, removal of dead assignments, and removal of `async` from functions with no `await`. These were kept mechanical and did not rename exports, alter API contracts, or intentionally change visual behavior.

## Out of scope and uncertainty

- The remaining Sonar rows listed as deferred need a later, smaller review. In particular, nested ternaries, cognitive complexity, index keys without stable IDs, nested component definitions, and awaits in loops were not mechanically forced.
- The typecheck cannot be made clean within this scope because the reported failures are outside `apps/web/src/app/`, and the local-search dependency resolves through the existing junctioned dependency tree. No dependency installation or junction rewrite was attempted.
- ESLint was run successfully against the changed source files, but no browser, accessibility-tree, visual, or SonarCloud rescan was available in this pass. Keyboard behavior should receive a browser-level check before release.
- The worktree remains uncommitted as requested.
