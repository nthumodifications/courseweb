# Agent caltz report

## What changed

- `apps/web/src/helpers/dates.ts` — established the Taipei instant/wall-clock boundary, with Taipei day/week/month construction, calendar-day arithmetic, picker conversion, formatting, time setting, and an exclusive academic-calendar query helper.
- `apps/web/src/helpers/dates.test.ts` — added fixed-instant tests for Taipei formatting, form-time storage, date-only values, and the inclusive-week/exclusive-end academic request.
- `apps/web/src/components/Calendar/Calendar.tsx` — uses Taipei week/month construction and Taipei-safe week/month navigation.
- `apps/web/src/components/Calendar/CalendarDateSelector.tsx` — formats and displays the selected period in Taipei and converts picker dates to Taipei-midnight instants.
- `apps/web/src/components/Calendar/CalendarWeekContainer.tsx` — uses Taipei date ranges, academic query boundaries, date-only parsing, Taipei day arithmetic, event positioning, and event-time formatting.
- `apps/web/src/components/Calendar/CalendarMonthContainer.tsx` — applies the same Taipei boundary to academic queries, date-only events, month/day calculations, all-day spans, and display formatting.
- `apps/web/src/components/Calendar/EventForm.tsx` — makes date/time pickers, all-day operations, repeat-end dates, defaults, and displayed values Taipei-correct; restores missing repeat fields whenever a repeat type is selected.
- `apps/web/src/components/Calendar/eventFormSchema.tsx` — validates repeat end dates by Taipei calendar key rather than browser-local midnight.
- `apps/web/src/components/Calendar/CurrentTimePointer.tsx` — keeps the existing Taipei wall-clock positioning and routes its displayed time through the shared Taipei formatter.
- `apps/web/src/hooks/useCourseDates.ts` — deliberately unchanged; it already compares course-date keys with `getTaipeiDateKey`, which is correct for the Taipei instant date representation.

## Finding 6

The calendar now represents date cells as actual Taipei-midnight instants. `getTaipeiWeek`/`getTaipeiMonthForDisplay` create those values; `startOfTaipeiDay`/`endOfTaipeiDay` are used before event-range queries; `toTaipeiWallClock` is used only for local getters and picker values; and `formatTaipei` is used for visible dates/times. Form picker output is converted back with `fromTaipeiCalendarDate`, and time changes use `setTaipeiWallClock` before submission.

Verification:

- `formatTaipei(new Date("2026-09-10T01:00:00.000Z"), "yyyy-MM-dd HH:mm")` returns `2026-09-10 09:00`.
- A fixed calendar instant set to 09:00 through the shared setter stores `2026-09-10T01:00:00.000Z`.
- Both checks pass with `TZ=America/Los_Angeles`, so they fail the old browser-local interpretation.
- No browser session was available; visual grid placement, picker interaction, and persisted create/edit behavior remain untested manually.

## Finding 7

`getTaipeiAcademicCalendarQuery` validates an inclusive Taipei range and sends the start key plus the date after the inclusive end key through `toAcademicCalendarBoundary`. Week and month containers now use this helper. Academic date-only results are validated and converted with `fromTaipeiDateKey`, then represented as Taipei all-day instants.

Verification: a Taipei week of `2026-09-06` through `2026-09-12` produces `{ start: "2026-09-06T00:00:00.000Z", end: "2026-09-13T00:00:00.000Z" }`, preserving the final day. The fixed date-only test retains `2026-09-14` as the Taipei key while its instant is `2026-09-13T16:00:00.000Z`, including west-of-UTC behavior.

## Finding 10

The repeat-type effect now initializes each missing `interval`, `mode`, and `value` whenever a non-null repeat type is selected. It no longer depends on whether the original event had no repeat, so the sequence existing repeat → No repeat → Daily/Weekly/etc. restores a valid repeat definition.

Verification: source tracing confirms No repeat clears the three fields and the subsequent non-null selection restores all three defaults (`1`, `count`, `1`). No component-level React form test exists in this worktree, so the interaction was not browser-tested.

## Deliberately not changed

- `calendar_utils.tsx` was not edited; its Taipei recurrence arithmetic is owned by the parallel recurrence agent, and these changes consume its existing `eventsToDisplay`/other exports.
- Prohibited files and directories, including `EventPopover.tsx`, `calendar_hook.tsx`, `useUpcomingEvents.ts`, timetable components, and all services, were not touched.
- The static 00:00–23:00 week-row labels and the `new Date().toISOString()` timetable sync checkpoint are not calendar wall-clock conversions and were left as-is.
- No RxDB schema/migration, environment variable, dependency, lockfile, deployment, commit, push, or server was needed.

## Verification totals

- `cd apps/web && bunx tsc --noEmit`: exactly 8 pre-existing errors, in `shops/page.tsx`, `GenericIssueFormDialog.tsx` (3), `IssueFormDialog.tsx` (3), and `worker.ts`; no new errors.
- `cd apps/web && bun test src`: 50 pass, 0 fail, 92 assertions across 8 files.
- `TZ=America/Los_Angeles cd apps/web && bun test src` (PowerShell equivalent used): 50 pass, 0 fail, 92 assertions.
- `cd apps/web && bun test src/helpers/dates.test.ts`: 8 pass, 0 fail, 16 assertions, also repeated under `America/Los_Angeles`.
- `cd apps/web && bun test src/features/campusMap`: 9 pass, 0 fail, 23 assertions.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: 6 pass, 0 fail, 8 assertions.
- `cd services/api && bunx tsc --noEmit`: 0 errors.
- `cd services/api && bun test`: 96 pass, 0 fail, 178 assertions.
- `cd apps/web && bunx vite build`: passed; 6,411 modules transformed. Existing Browserslist, Tailwind, PDF `eval`, and chunk-size warnings were non-fatal.
- `git diff --check`: passed; only Git's existing LF/CRLF normalization warnings were reported.

## Remaining limitations

There was no authenticated/browser acceptance run. The calendar UI, date pickers, event creation/edit persistence, academic API response behavior, and interaction sequence for finding 10 still need maintainer browser verification. The parallel `calendar_utils.tsx` recurrence changes must be merged alongside this work before judging the complete calendar recurrence path.
