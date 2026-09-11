# calrecur fix report

## Changes by file

- `apps/web/src/components/Calendar/calendar_utils.tsx`: made recurrence/exclusion arithmetic Taipei-wall-clock based and made timed display selection use interval intersection with clipped boundaries.
- `apps/web/src/components/Calendar/calendar_utils.test.ts`: converted fixed-date fixtures to explicit Taipei instants and added Taipei timezone and cross-midnight regressions.
- `apps/web/src/components/Calendar/calendar_hook.tsx`: integrated root re-anchoring for ALL edits, count-safe FOLLOWING deletion, and serialized exception dates for upserts.
- `apps/web/src/components/Calendar/calendar_hook.test.ts`: added provider-level tests for the actual ALL and FOLLOWING hook branches.
- `apps/web/src/components/Calendar/timetableReconcile.ts`: excludes detached exception children from generated-root deletion and carries root `excludedDates` through generated updates.
- `apps/web/src/components/Calendar/timetableReconcile.test.ts`: added the delete-this-then-sync detached-child regression.
- `apps/web/src/hooks/useUpcomingEvents.ts`: removed the duplicate cumulative recurrence engine and delegates expansion to `calendar_utils.tsx`.
- `apps/web/src/hooks/useUpcomingEvents.test.ts`: added anchored Jan 31 monthly and Feb 29 yearly dashboard expansion tests.
- `services/secure-api/src/utils/icalendar.ts`: queries `actualEnd` for overlap and emits `COUNT` for count rules, reserving `UNTIL` for date rules.
- `services/secure-api/src/utils/icalendar.test.ts`: updated count-rule expectations and added count/past-rooted repeat regressions with query assertions.

## Findings fixed and verification

### Finding 1

`reconcileTimetableEvents` now treats only generated roots as deletion candidates (`parentId` children are preserved), and generated root rewrites retain persisted `excludedDates`. The hook’s `addEvent` path serializes those dates before RxDB upsert. `timetableReconcile.test.ts` verifies a root with a Sep 14 exclusion plus a detached edited child produces no child deletion and preserves the exclusion on a changed root upsert.

### Finding 4

The `UpdateType.ALL` branch now calls `reanchorSeriesEdit(oldEvent, newEvent)` before serialization and recomputes `actualEnd` from that root-anchored event. The provider-level `calendar_hook.test.ts` invokes the real hook branch for a Sep 12 edit of a Sep 10-rooted series and verifies the persisted start/end remain Sep 10 with the edited time.

### Finding 5

The `UpdateType.FOLLOWING` delete branch now uses `getRepeatDefinitionBefore`; count rules retain `mode: "count"` and receive the preceding occurrence count. The same provider-level hook test deletes from occurrence three of a daily count-five series and verifies `value: 2` and an actual end on Sep 11, with no exception thrown or remove call.

### Finding 6

`calendar_utils.tsx` now converts stored instants to Taipei wall-clock fields before daily, weekly, monthly, yearly, cutoff, exclusion, and edit re-anchoring arithmetic, then converts results back to instants. The calendar recurrence suite passes under `TZ=America/Los_Angeles` (11 tests), including the explicit Taipei wall-clock regression; no component or form files owned by the parallel agent were changed.

### Finding 8

`useUpcomingEvents.ts` no longer advances occurrences with its own `addMonths`/`addYears` loop. It uses the anchored, range-bounded `getRepeatedStartDays` implementation from `calendar_utils.tsx`. Its two fixed-date tests verify a Jan 31 monthly series returns Mar 31 and a Feb 29 yearly series returns Feb 29 again in 2028.

### Finding 9

Timed events are now selected when their interval intersects the requested range, and `displayStart`/`displayEnd` are clipped to that range. The fixed Taipei 23:30–01:00 test verifies one display segment on Sep 10 and one on Sep 11.

### Finding 11

The personal ICS query now overlaps `start` with the export horizon and `actualEnd` with the current instant, allowing past-rooted repeats to remain candidates. Count rules pass `count` to `ical-generator`; date rules alone pass `until`. The 13-test ICS suite verifies `COUNT=10`, no count-derived `UNTIL`, a past-rooted repeat with future `actualEnd`, and the `actualEnd` query field.

## Deliberately not done

- `Calendar.tsx`, the week/month containers, `EventForm.tsx`, `useCourseDates.ts`, timetable components, and other restricted files were not changed; those belong to the parallel owners or were explicitly excluded.
- `EventPopover.tsx` was not changed because it intentionally supplies the clicked occurrence to the form; the hook’s ALL branch now re-anchors that payload to the root.
- The separate JSON calendar query in `services/secure-api/src/api/calendar.ts` was not changed; finding 11 concerned personal ICS and that file was outside this ownership brief.
- No schema migration, environment variable, dependency, lockfile, deployment, commit, push, or long-running process was used.

## Migration and maintainer steps

No data migration or environment variable is required; `actualEnd` and the existing event schema are reused. The deployed Firestore query should have a composite index compatible with `start` and `actualEnd`; if production returns Firebase `FAILED_PRECONDITION`, create the exact index requested by that error before enabling the ICS path.

## Verification totals

- `cd apps/web && bun test src`: **54 pass**, 0 fail, 108 expect calls.
- `cd apps/web && bun test src/components/Calendar`: **21 pass**, 0 fail, 39 expect calls.
- `cd apps/web && bun test src/features/campusMap`: **9 pass**, 0 fail, 23 expect calls.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: **6 pass**, 0 fail, 8 expect calls.
- `cd apps/web && bunx tsc --noEmit`: **exactly 8 errors**, all established errors in `shops/page.tsx`, `GenericIssueFormDialog.tsx` x3, `IssueFormDialog.tsx` x3, and `worker.ts`.
- `cd apps/web && bunx vite build`: **passed**, 6,411 modules transformed; existing Browserslist, Tailwind, pdfjs eval, and chunk-size warnings remain.
- `cd services/api && bunx tsc --noEmit`: **0 errors**.
- `cd services/api && bun test`: **96 pass**, 0 fail, 178 expect calls.
- `cd services/secure-api && bunx tsc --noEmit`: **0 errors**.
- `cd services/secure-api && bun test`: **46 pass**, 0 fail, 164 expect calls.
- `cd services/secure-api && bun test src/utils/icalendar.test.ts`: **13 pass**, 0 fail, 72 expect calls.
- `git diff --check`: **passed**.

## Remaining broken, stubbed, or untested

- No authenticated browser session or live Firestore ICS request was run; the production composite-index step remains conditional on the deployed index state.
- The separate JSON calendar endpoint retains its pre-existing `end`-based query because it is outside this task’s ownership and scope.
- The eight established web type errors remain unchanged and unrelated to these files.
