# Academic dates and upcoming surfaces

## Changed, file by file

- `apps/web/src/helpers/dates.ts`: Added the shared Asia/Taipei date-key parser, formatter, calendar-day adder, validity check, inclusive-range conversion, and timezone-safe `getRangeOfDays`.
- `apps/web/src/hooks/useCourseDates.ts`: Matches API date-only course dates by Taipei `yyyy-MM-dd` keys instead of parsing them as JavaScript instants.
- `apps/web/src/hooks/useUpcomingEvents.ts`: Re-exported the shared Taipei helpers, normalized academic dates through an inclusive-range helper, preserved Taipei feed query boundaries, normalized static semester boundaries, and made the user setting an unconditional academic-feed gate.
- `apps/web/src/hooks/useUpcomingEvents.test.ts`: Added fixed-date tests for Taipei/UTC divergence, an inclusive multi-day range, and both academic feed boundaries.
- `apps/web/src/components/Calendar/UpcomingEvents.tsx`: Uses the hook’s canonical seven-day source; it still presents only five day panels as a layout choice.
- `apps/web/src/components/Calendar/MinifiedUpcomingEvents.tsx`: Uses the hook default instead of its former private 14-day window.
- `apps/web/src/components/Calendar/UpcomingEventList.tsx`: Applies the `showAcademicCalendar` gate defensively to every shared list renderer.
- `apps/web/src/components/Widgets/ScheduleWidget.tsx`: Uses the hook default and dictionary-backed widget strings; its compact list therefore inherits the academic gate.
- `apps/web/src/components/Widgets/CountdownWidget.tsx`: Uses the hook default for Next up, normalizes semester boundaries to Taipei dates, and moves widget strings into the dictionaries.
- `apps/web/src/components/Today/TodaySchedule.tsx`: Uses the hook default, keeps the explicit academic visibility guard for the five-day presentation, and retains past class occurrences for the schedule view.
- `apps/web/src/dictionaries/en.json`: Added English schedule/countdown labels required by the owned widgets.
- `apps/web/src/dictionaries/zh.json`: Added Taiwan Traditional Chinese equivalents with the same key tree.

## Audit findings and verification

### Section 3: date-only and timezone handling

- `useCourseDates.ts:41` previously used `new Date(d.date)` and browser-local `isSameDay`. It now compares the returned date-only string directly to `getTaipeiDateKey(day)`, so a stored academic/course date remains a calendar key until a display boundary is needed.
- The academic branch in `useUpcomingEvents.ts` previously bypassed its named date helper with inline `fromZonedTime`. It now validates the key with `isTaipeiDateKey` and converts it with `getTaipeiDateRange`, whose start is Taipei midnight and whose end is the midnight after the inclusive final date.
- The academic API query remains compatible with the current API’s UTC-date truncation: `toAcademicCalendarBoundary("2026-09-14")` is `2026-09-14T00:00:00.000Z`, and a window ending inclusively on Sep 16 sends the next-date boundary `2026-09-17T00:00:00.000Z`.
- The direct helper test proves the non-naive case: `fromTaipeiDateKey("2026-09-14")` is `2026-09-13T16:00:00.000Z`, whose Taipei key is still `2026-09-14`; the UTC date portion is deliberately different. The inclusive range test proves `2026-09-14..2026-09-16` has a start key of Sep 14, an end key of Sep 17, and an instant one millisecond before end on Sep 16.
- `getRangeOfDays` no longer advances by `86400000`; it advances Taipei calendar days. `TodaySchedule` already used the shared `addTaipeiDays` path from the previous round, so no millisecond day generator remained in that owned surface.
- Static `semesterInfo` dates are local `Date` objects in the shared constants. The hook and countdown widget now read their source calendar fields and rebuild Taipei ranges, including the full end date. Countdown duration division is applied only to the resulting Taipei boundary instants, not to a date-only ISO parse.

Date-only call-site inventory: changed `useCourseDates.ts`, the academic branch and semester normalization in `useUpcomingEvents.ts`, `helpers/dates.ts`, and the owned Countdown/Today consumers; already correct in the owned upcoming renderers because they use `getTaipeiDateKey` for grouping and `formatInTimeZone` for display; not correct and therefore left for the parallel owner in `CalendarWeekContainer.tsx` and `CalendarMonthContainer.tsx` as listed below.

### Section 6: upcoming semantics

- Every consumer found by the final search uses `useUpcomingEvents`: `today/page.tsx`, `UpcomingEvents`, `MinifiedUpcomingEvents`, `ScheduleWidget`, `CountdownWidget`, and `TodaySchedule`.
- No consumer keeps private recurrence expansion or sorting. The hook remains the sole chronological sorter. The former 14-day compact window was removed; all normal consumers now use the hook’s documented seven-day default. The five displayed day panels, current-day class selection, and list `maxEvents` caps are presentation filters. `includePast: true` remains only on the schedule-style views so already-started classes can be displayed; `UpcomingEventList` removes past rows for upcoming presentations.
- Verification: source search showed no consumer-level `windowDays` remaining and no consumer-level `.sort`; the focused helper tests, web typecheck, and Vite build passed.

### Academic-calendar visibility

- `useUpcomingEvents` now computes `includeAcademicCalendar` as `showAcademicCalendar && (options.includeAcademicCalendar ?? true)`, so an option cannot override a user who disabled the setting. The query is disabled and the academic event branch is empty when the setting is false.
- `UpcomingEventList` also removes `source === "academic"` rows when the setting is false. This covers the UpcomingEvents panel, minified/sidebar list, Today upcoming panel, Today per-day calendar rows, ScheduleWidget compact list, and CountdownWidget Next up line.
- The settings UI was already reachable at `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:240-248`: it reads `showAcademicCalendar` and binds it to a visible `Switch`. I read it but deliberately did not edit that page or `settings.tsx`.

## Deliberately not changed

- `CalendarWeekContainer.tsx` and `CalendarMonthContainer.tsx` are outside this agent’s ownership. They already gate their academic feed with `showAcademicCalendar`, but their direct feed paths still use raw `.toISOString()` boundaries and `new Date(event.date)`; the parallel owner must apply the shared date contract there before the entire repository can be called timezone-safe.
- `calendar_utils.tsx`, `calendar.types.ts`, `calendar_hook.tsx`, `config/rxdb.tsx`, `EventForm.tsx`, `EventPopover.tsx`, and `components/Timetable/` were not edited per the brief.
- The API service was not changed. Its response currently exposes only each academic item’s `start.date`, so this change can preserve an inclusive range when one is available to the web layer but cannot recover a multi-day `end.date` that the service does not return. No migration, new dependency, lockfile change, or application environment variable is needed.

## Verification

- `cd apps/web && bunx tsc --noEmit`: exit 1 with exactly 8 pre-existing errors, all in `shops/page.tsx`, `GenericIssueFormDialog.tsx` (3), `IssueFormDialog.tsx` (3), and `worker.ts`; no changed file is listed.
- `cd services/api && bunx tsc --noEmit`: 0 errors, exit 0.
- `cd apps/web && bun test src/hooks/useUpcomingEvents.test.ts`: 3 pass, 0 fail, 9 expectations.
- The same focused test passed under `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland`, 3 pass each.
- `cd apps/web && bun test src/features/campusMap`: 9 pass, 0 fail.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: 4 pass, 0 fail.
- `cd services/api && bun test`: 96 pass, 0 fail.
- `cd apps/web && bunx vite build`: passed; 6,970 modules transformed and production build completed.
- Prettier check over all changed app/report-owned source and dictionary files: passed.
- `git diff --check`: passed.
- English/zh dictionary key-tree comparison: identical.

## Remaining risks

- No browser session or live academic API/RxDB integration test was run. The date contract is covered by pure fixed-date tests and source tracing; the outside-ownership week/month paths remain untested by this agent and still need their parallel fix.
- The focused test imports the application hook, whose config modules require Vite environment variables. The test was run with temporary placeholder `VITE_COURSEWEB_API_URL` and `VITE_NTHUMODS_AUTH_*` values; no files or persistent environment settings were changed.
