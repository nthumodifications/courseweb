# Courses, course detail, and timetable design-language migration

Date: 2026-09-11

## Changes by audit item

- **CR1:** The course search route now uses `PageShell width="full"`. Search
  regions and hits carry `min-w-0`; result rows use a wrapping body with a
  shrinking action column. `SelectCourseButton` has a compact mobile mode that
  keeps the icon at the narrow breakpoint and reveals the short action label at
  `sm`. Titles, venues, descriptions, badges, and the Algolia attribution can
  wrap or truncate without widening the page. The result skeleton mirrors this
  responsive row structure.
- **CR2:** `CourseTagsList` now uses shared `Badge` variants: enrollment,
  capacity, and credits are `secondary`; language, duration, X-Class, and GE
  metadata are `outline`; `closed_mark` is `destructive`. Badge contents use
  `tabular-nums` and no longer use decorative per-colour utilities.
- **CR3:** The filter rail and search-results region use `PageHeader`; filter
  controls are grouped with `Section`; the result count and Algolia mark share
  one muted, `text-xs tabular-nums` metadata line. The mobile filter drawer
  uses the same `PageHeader` treatment. The course side panel now has matching
  constrained gutters and scroll containers across its tabs.
- **Course detail:** The route is wrapped in `PageShell width="app"`. The
  detail loading state uses the shared `PageSkeleton` and `Skeleton` primitives
  while preserving a skeleton of the real summary/content/sidebar proportions.
  Loaded details use `PageHeader` for course title/code with the back control in
  its actions slot. The missing-course state is a shared `EmptyState`, and the
  related-course table is contained on narrow screens.
- **TT1 / TT3 / S7 timetable panel:** The sidebar is grouped into named
  `Section`s for actions, this semester, and share/export. The no-course state
  is a shared `EmptyState` with one course-search action. Utility icons have
  accessible labels/tooltips and 40px targets. The OpenCollective sponsor card
  was removed from the tool panel.
- **TT2:** The timetable page and share-view page contain the existing grid in
  `min-w-0 max-w-full overflow-x-auto overflow-y-hidden` wrappers. The grid
  cells, columns, row sizing, proportions, and interactions were not changed;
  only the containing overflow boundary was adjusted. Sidebar controls and
  counts now wrap within the viewport.
- **Course colours:** The existing single `timetableColors` palette remains the
  source through `useUserTimetable` / `currentColors` and `colorMap`; no palette
  was duplicated. Course and custom-item chips in the timetable, course dialog,
  mini timetable, and share view use the same `h-4 w-4 rounded-sm` shape. The
  today-page swatches were already using that shape and were outside this task's
  owned files.

## Rules and remaining work

No rule in `LANGUAGE.md` proved impractical. The timetable-grid boundary was
treated as binding: no grid structure, sizing, cell styling, or interaction was
redesigned.

Pre-existing design-lint debt remains in adjacent, untouched components such as
`SyllabusSummary`, `TimeslotSelector`, `TimeSelectionFilter`, and
`FavouritesCourseList`; this change did not add violations. A browser visual
pass at the requested four viewport/theme combinations was not available in
this agent shell, so that check remains for the manager's review.

No new shared primitive was needed. The existing `PageShell`, `PageHeader`,
`EmptyState`, `Section`, `PageSkeleton`, `Skeleton`, and shadcn components were
enough. The compact course action and semantic course-badge mapping are local
composition patterns; if they recur elsewhere, they would be good candidates
for a future shared course UI layer.

## Verification

- `cd apps/web && bunx tsc --noEmit`: the final run has the same eight
  pre-existing diagnostics as the baseline: one shops `unknown` assignment,
  three `GenericIssueFormDialog` `unknown` accesses, three
  `IssueFormDialog` `unknown` accesses, and `worker.ts`'s
  `CacheStorage.default` diagnostic. No new errors were introduced.
- `bun run design-lint`: passed with no new violations (`342` hardcoded-color,
  `202` dark-color, `10` large-type, `38` overlay-shadow).
- zh/en dictionary key trees: matched (`1297` keys each).
- `git diff --check`: passed; only the repository's normal LF/CRLF conversion
  warnings were emitted.

