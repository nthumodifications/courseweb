# Recurrence agent report

## Changed files

- `apps/web/src/components/Calendar/calendar_utils.tsx`: Replaced cumulative recurrence expansion with anchored, range-bounded occurrence indexing; added calendar-date cutoff handling, recurrence truncation, edit-all re-anchoring, and consistent recurrence-end calculation.
- `apps/web/src/components/Calendar/calendar.types.ts`: Documented count semantics, inclusive local date-cutoff semantics, and the persisted `actualEnd` compatibility field.
- `apps/web/src/components/Calendar/eventFormSchema.tsx`: Added cross-field validation rejecting a date-mode repeat end before the event start’s calendar date.
- `apps/web/src/components/Calendar/calendar_utils.test.ts`: Added nine fixed-date regression tests covering the requested recurrence cases and the recurrence-bound behavior.

## Audit findings

### 1. Date-mode cutoff drops the final day

Reproduction: a daily event on 2026-09-10 from 09:00 to 10:00 with a date-mode cutoff of local midnight 2026-09-12 previously displayed only September 10 and 11.

Fix: `getLastRuleOccurrenceIndex` compares occurrence and cutoff calendar dates with `startOfDay`; the correction is centralized in the recurrence model and is shared by expansion and `getDisplayEndDate`. The form schema also rejects a cutoff before the event start date.

Verification: `calendar_utils.test.ts:41` displays September 10, 11, and 12; `calendar_utils.test.ts:68` rejects the earlier cutoff.

### 2. Cumulative month/year arithmetic drifts

Reproduction: a 2026-01-31 monthly series previously produced January 31, February 28, March 28; a Feb 29 yearly series permanently became Feb 28 after the first non-leap year.

Fix: `getOccurrenceStart` calculates every occurrence from the original start anchor. The explicit policy is to clamp an invalid target day to that target month’s last day. Monthly and yearly rules use the same policy, so a Feb 29 yearly series returns to Feb 29 in 2028.

Verification: `calendar_utils.test.ts:90` expects Jan 31, Feb 28, Mar 31; `calendar_utils.test.ts:110` expects Feb 29, Feb 28, Feb 28, Feb 28, Feb 29 across 2024–2028.

### 3. Weekly date-mode display end can pass the cutoff

Reproduction: a Monday 2026-09-14 event with a Sunday 2026-09-20 cutoff previously returned the following Monday, September 21.

Fix: the shared final-occurrence index steps backward from the cutoff to the last occurrence on the event’s weekday, then `getDisplayEndDate` applies the event duration.

Verification: `calendar_utils.test.ts:132` expects September 14 at 10:00, not September 21.

### 4. Count mode miscounts after a deletion

Policy: excluded dates consume occurrence slots. This preserves the original count: deleting one occurrence makes a five-slot series display four events and does not move the last slot. “Delete following” keeps count mode and changes its value to the number of slots before the selected occurrence; date-mode rules use the preceding local calendar date.

Fix: `getRepeatDefinitionBefore` in `calendar_utils.tsx:279` provides the correct truncated rule. The range expander continues to count from the true series root while filtering `excludedDates`.

Verification: `calendar_utils.test.ts:147` proves a five-slot series truncated before its third occurrence becomes count 2 and separately proves deleting one occurrence leaves the four original remaining slots.

Caller still needing manager application: `apps/web/src/components/Calendar/calendar_hook.tsx:255-268` currently writes `mode: "count"` with `subDays(displayStart, 1).getTime()`. Import `getRepeatDefinitionBefore`, call it with `event` and `displayStart`, and write the returned rule; if it returns `null` for deleting from the root, remove/empty the root instead of persisting a rule that still yields the root. This caller edit was intentionally not made because `calendar_hook.tsx` is outside ownership.

### 5. Edit-all does not re-anchor to the series root

Reproduction: `EventPopover.tsx:193-197` passes the clicked occurrence’s `displayStart`/`displayEnd` into the form, so editing all from a later occurrence currently moves the stored series start to that occurrence.

Fix: `reanchorSeriesEdit` in `calendar_utils.tsx:298` preserves the root calendar date, applies the edited occurrence’s time of day, and retains the edited duration.

Verification: `calendar_utils.test.ts:178` edits a September 12 occurrence and verifies the all-series payload starts on the September 10 root date with the edited time.

Caller still needing manager application: `apps/web/src/components/Calendar/calendar_hook.tsx:381-389` should import `reanchorSeriesEdit`, create `const seriesEvent = reanchorSeriesEdit(oldEvent, newEvent)`, and use `seriesEvent` for both `serializeEvent(...)` and `getActualEndDate(...)` in the `UpdateType.ALL` branch. If ALL can be invoked on a detached child, resolve its root before calling the helper; that root-family behavior is also outside this file set.

### 6. Unbounded expansion

Reproduction: expansion of a daily rule beginning 2020-01-01 with a count of 1,000,000,000 previously generated from the root before the one-week view was filtered. A range-start-relative implementation could also incorrectly show a count-limited series after its true final occurrence.

Fix: `eventsToDisplay` passes its range to `getRepeatedStartDays`. The generator calculates the first occurrence at or before the range start and the last occurrence at or before the range end, then intersects that index range with the rule’s count/date limit. Count limits remain zero-based from the original series start.

Verification: `calendar_utils.test.ts:219` queries September 10–17, 2026 against the billion-count rule and returns eight displayed occurrences immediately; the same test confirms a three-count series beginning September 1 returns zero events in that later range.

### 7. `actualEnd` is dead/inconsistent

The owned code now derives `getActualEndDate` and `getDisplayEndDate` from the same anchored final-occurrence calculation, and `calendar_utils.test.ts:251` verifies the corrected persisted end for a Jan 31 monthly count rule. `actualEnd` was not deleted: it remains required by `apps/web/src/config/rxdb.tsx:48-50,97` and is read by the calendar hook and other web event types.

I checked the secure-api side. `services/secure-api/src/api/calendar.ts:220-221` and `services/secure-api/src/utils/icalendar.ts:60-61` query base `start`/`end`, not `actualEnd`; `services/secure-api/src/utils/icalendar.ts:102-110` also maps every repeat value to iCalendar `UNTIL`, which is wrong for count mode. Therefore this finding is not fully closed in this worktree.

Required manager changes: use a recurrence-aware/`actualEnd` overlap query in both secure-api query paths, emit `COUNT` for count-mode ICS and `UNTIL` only for date-mode ICS, and replace the `new Date(repeat.value)` actual-end construction in `apps/web/src/components/Calendar/Calendar.tsx:382` and `apps/web/src/hooks/useUpcomingEvents.ts:184` with the shared recurrence-bound calculation. Those files are outside ownership.

## Deliberately not changed

- `calendar_hook.tsx`, `EventForm.tsx`, `EventPopover.tsx`, `config/rxdb.tsx`, `useCourseDates.ts`, `useUpcomingEvents.ts`, `components/Timetable/**`, and secure-api files were read where needed but not edited because they are outside this agent’s ownership.
- The EventForm “No Repeat then directly select another repeat type” default-restoration issue, detached-child ALL deletion, DST wall-clock behavior, cross-midnight rendering, and the broader week/month layout performance findings were not part of the owned recurrence implementation. Their call sites or separate renderers need their owning agents.
- No schema migration, environment variable, dependency, lockfile, commit, push, or long-running server was used.

## Verification

- `cd apps/web && bun test src/components/Calendar/calendar_utils.test.ts`: **9 pass, 0 fail, 14 expect() calls**.
- `cd apps/web && bun test src/features/campusMap`: **9 pass, 0 fail**.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: **4 pass, 0 fail**.
- `cd apps/web && bunx tsc --noEmit`: **8 errors**, exactly the established baseline (`shops/page.tsx`, `GenericIssueFormDialog.tsx` x3, `IssueFormDialog.tsx` x3, `worker.ts`); no owned-file errors.
- `cd services/api && bunx tsc --noEmit`: **0 errors**.
- `cd services/api && bun test`: **96 pass, 0 fail, 178 expect() calls**.
- `cd apps/web && bunx vite build`: **passed**; existing Browserslist, Tailwind, pdfjs eval, and large-chunk warnings remain.
- Prettier check on the four owned source/test files: **passed**; `git diff --check`: **passed**.

## Remaining broken or untested

- The recurrence utility and schema regressions are tested and green, but delete-following and edit-all UI behavior remains dependent on the two precise `calendar_hook.tsx` integrations above.
- Cross-package `actualEnd` query/ICS authority remains unimplemented pending secure-api and caller ownership.
- No browser-level calendar interaction test was run.
