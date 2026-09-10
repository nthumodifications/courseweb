# Dashboard upcoming dates report

## Changed

- `apps/web/src/hooks/useUpcomingEvents.ts`: Added the typed shared source that reads RxDB-backed calendar events, expands recurrences, derives saved-timetable classes through `timetableToCalendarEvent`, merges course dates and NTHU academic dates, applies a Taipei-local window, sorts deterministically, and returns state/countdown metadata plus `nextEvent`.
- `apps/web/src/components/Calendar/UpcomingEventList.tsx`: Added the shared grouped/compact renderer with Today/Tomorrow/weekday headings, time/all-day display, source badges, calendar-event popovers, and an empty state.
- `apps/web/src/components/Calendar/UpcomingEvents.tsx`: Replaced local RxDB/API filtering and sorting with the shared hook while preserving the weather/day-panel layout.
- `apps/web/src/components/Calendar/MinifiedUpcomingEvents.tsx`: Replaced the local two-week recurrence/window/sort implementation with the shared hook and compact renderer.
- `apps/web/src/components/Widgets/ScheduleWidget.tsx`: Uses shared class events for today and adds a compact grouped Upcoming section.
- `apps/web/src/components/Widgets/CountdownWidget.tsx`: Extended the existing countdown widget with the shared prominent Next up line and source badge.
- `apps/web/src/components/Today/TodaySchedule.tsx`: Uses shared class/academic/course-date events for the five-day schedule, adds Next up and a compact Upcoming section, and removes its duplicate academic-calendar query/windowing.
- `apps/web/src/app/[lang]/(mods-pages)/today/page.tsx`: Preserved both dashboard flags and adds a mobile-only Upcoming/Next up panel for the new-calendar variant.
- `apps/web/src/dictionaries/en.json`: Added English labels for upcoming states, empty states, day headings, and source badges.
- `apps/web/src/dictionaries/zh.json`: Added Taiwan Traditional Chinese equivalents for the same labels; dictionary key trees were verified identical.

## Deliberately not changed

- The three feature flags and their routing in `today/page.tsx` remain unchanged.
- `Calendar.tsx`, `CalendarWeekContainer.tsx`, `CalendarMonthContainer.tsx`, `EventForm.tsx`, `eventFormSchema.tsx`, `calendar_hook.tsx`, `Timetable/*`, and `useCourseDates.ts` were not edited because they are outside this task's ownership scope.
- `CalendarPage.tsx` was not edited for the same scope reason; its existing XL UpcomingEvents panel now uses the shared hook. The allowed `today/page.tsx` wrapper adds a mobile-only compact panel for the new-calendar variant.
- No new dependency was added; `date-fns-tz` was already declared by `apps/web`.

The widget dashboard should win as the long-term default: it now has a compact schedule/upcoming surface and the existing countdown widget provides the prominent next-item affordance, while remaining configurable. The three-way flag is intentionally still supported.

## Hook API and semantics

`useUpcomingEvents(options?)` accepts `windowDays` (default `7`), optional Taipei-local `start`, optional `now` override, `includeAcademicCalendar` (default follows the existing setting), and `includePast` (default `false`; used by the full classic schedule). It returns `{ events, nextEvent, windowStart, windowEnd, isLoading, error }`. Each event is typed with `source` equal to `calendar`, `class`, `course-date`, or `academic`, plus `start`, `end`, `allDay`, `state`, and `startsInMinutes`.

The merge includes all RxDB calendar occurrences, saved-timetable class occurrences, course-specific dates, and the academic-calendar API response. The default window is the current Asia/Taipei calendar day through the next six days, with `windowEnd` exclusive; overlapping in-progress events are retained. Events are sorted by start time, all-day priority, source priority, and stable ID. `nextEvent` prefers an active or upcoming timed event, then falls back to the first active/all-day event. Consumers may request past occurrences for the full schedule, while compact Upcoming lists filter them out.

## Migration, environment, and maintainer steps

- No database migration is required; the hook only reads existing RxDB documents and existing API responses.
- No environment variable or lockfile change is required.
- No manual data migration is required. A maintainer should still perform a browser smoke check at 375px and desktop widths, including a Taipei-local date boundary, after the branch is integrated.

## Validation

- `cd apps/web && bunx prettier --check ...`: passed for all changed app files.
- `cd apps/web && bunx tsc --noEmit`: reports exactly 8 errors, matching the supplied baseline; no changed file appears in the errors.
- `git diff --check`: passed for tracked changes.
- English/Traditional-Chinese dictionary tree comparison: passed.

The academic-calendar API returns date-only `yyyy-MM-dd` values. The hook interprets those at midnight in `Asia/Taipei`; because the API implementation truncates incoming ISO values to a UTC date, its query boundaries are sent as the equivalent `08:00` Taipei instant so the requested Taipei date is preserved. Stored calendar timestamps and timetable recurrence expansion are also converted/formatted as Asia/Taipei wall-clock values. The existing course-date matcher is date-only/local-day based, so the hook supplies the UTC-midnight-equivalent comparison instant for those values.

## Untested or remaining limitations

- No browser session or live RxDB/API integration test was run; the typecheck, formatting, dictionary parity, and diff checks were run.
- Weather rendering remains its existing separate query and was not part of the shared dated-event source.
