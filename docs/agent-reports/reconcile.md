# Timetable event reconciliation report

## 1. Changes by file

- `apps/web/src/components/Calendar/Calendar.tsx`: unions current and checkpoint semesters, gathers settled generated/persisted event sets, prompts with deletion counts, applies awaited diffs, and checkpoints only after the writes.
- `apps/web/src/components/Calendar/timetableReconcile.ts`: adds the pure event diff and semester-union functions, including metadata comparison and hand-made-event protection.
- `apps/web/src/components/Calendar/timetableReconcile.test.ts`: adds seven deterministic tests for drops, slot changes, metadata changes, empty/removed semesters, hand-made events, and no-op reconciliation.
- `apps/web/src/components/Calendar/CalendarTimetableSyncDialog.tsx`: surfaces the count of generated events that acceptance will delete in the existing confirmation dialog.
- `apps/web/src/components/Calendar/calendar_hook.tsx`: waits for initial event replication and adds an explicit-ID bulk removal method for approved generated roots.
- `apps/web/src/dictionaries/en.json`: adds English deletion and sync-failure messages and updates cancellation text.
- `apps/web/src/dictionaries/zh.json`: adds matching Traditional Chinese (Taiwan) deletion and sync-failure messages and updates cancellation text.
- `apps/web/src/hooks/useSyncedStorage.tsx`: exposes whether the current user’s synced KV record has completed its first remote reconciliation.
- `apps/web/src/hooks/contexts/useUserTimetable.tsx`: exposes timetable readiness only after course selection and course-colour KV records settle.
- `docs/agent-reports/reconcile.md`: records the judgement call, safety guards, verification, and remaining untested paths.

The last two hook changes are the smallest justified ownership-boundary extension: `coursesLoading` only covers the course API query, while cached KV timetable data can otherwise remain visible during an OIDC user transition.

## 2. Findings fixed and verification

### Timetable reconciliation was add-only

`Calendar.tsx` now visits `Object.keys(courses)` unioned with all persisted `timetablesync` semester keys. A current key with zero courses produces an empty generated set, and a checkpoint-only semester is visited with an empty current set. The pure semester-union test covers the removed-semester visit; the empty and removed-semester diff tests prove the resulting delete IDs.

### Dropped courses, changed slots, and changed metadata leaked stale events

The pure function filters persisted events to non-null `courseId` records, deletes generated IDs absent from the current set, and upserts only missing or changed current events. The caller narrows persisted records to the semester encoded by the timetable course ID. Tests prove:

- dropped course: only its old ID is deleted;
- changed slot: old ID is deleted and new ID is returned for upsert;
- changed title, venue, or colour at the same ID: that event is returned for upsert and nothing is deleted;
- unchanged generated event: both write lists are empty.

Accepted writes use the new hook bulk remover and awaited `addEvent` calls before the checkpoint upsert. A failed delete/upsert or checkpoint write shows the localized failure toast and does not mark the event pass complete.

### Empty and removed semesters were skipped

The current loop no longer returns when the course map is empty. A checkpoint-only semester therefore generates an empty set and produces deletes for its persisted generated events. The seven-test focused suite passed: `7 pass`, `0 fail`, `8 expect()` calls.

### Hand-made events must remain untouched

The pure function excludes `courseId: null` and `courseId: undefined` from both mutation lists. It also protects a hand-made ID collision: a hand-made persisted event wins over a generated event with the same ID, so the generated event is not upserted over it. The hand-made test covers both nullable forms and a generated-looking ID.

### Destructive writes must not use unsettled timetable/event data

The reconciliation pass requires all of the following:

- the identity-scoped RxDB provider has mounted the current database;
- `timetableSyncReady` is true after the current timetable checkpoint collection’s initial replication, or local-only mode is established;
- `eventSyncReady` is true after the current event collection’s initial replication, or local-only/no-scope mode is established;
- `timetableDataReady` is true only after the current subject’s `courses` and `course_color_map` KV records have completed their first remote reconciliation;
- `coursesLoading` is false, there is no course-query error, and every selected course ID has a materialized course record.

The identity-scoped database and provider transition behavior are the protections described by `calidentity.md`; the new event/KV readiness gates close the remaining source-level loading windows. If any guard is false, this pass does nothing. Acceptance rechecks the guards and regenerates the request from current data before applying a diff.

I did not run an authenticated browser transition, so A-to-B logout/login timing, real replication ordering, and a user changing the timetable while the dialog is open remain source-traced rather than browser-verified.

## 3. Judgement call

I chose to surface deletion confirmation in the existing `CalendarTimetableSyncDialog`. A timetable-generated event may have been manually edited, and asking before deleting is consistent with the existing add/sync consent flow. The dialog displays the deletion count; cancelling changes no calendar events. The checkpoint records the current generated course set as before, but the persisted-event diff remains detectable, so a later mount can ask again rather than silently treating stale events as reconciled.

The dedicated bulk remover is intentional: interactive `removeEvent` has recurring-series choices and does not mean “remove this exact persisted root.” Reconciliation has already received the dialog approval and therefore removes only the exact IDs returned by the pure diff.

## 4. Deliberately not done

- No changes were made to `config/rxdb.tsx`, `calendar.types.ts`, timetable producers, date helpers, `calendar_utils.tsx`, or the unrelated timetable components; the v2 schema and converter’s existing `courseId`/deterministic-ID contract were reused.
- I did not implement the separate audit note about unknown semester metadata in `timetableToCalendarEvent.tsx`; that is outside the four-step deferred reconciliation plan and there is no additional user-facing error contract in this change.
- No migration, environment variable, package, lockfile, deployment, commit, push, browser automation, or live API/Firestore operation was added.

## 5. Verification totals

- `cd apps/web && bun test src/components/Calendar/timetableReconcile.test.ts`: **7 pass**, 0 fail, 8 assertions.
- `cd apps/web && bun test src/components/Calendar/calendar_utils.test.ts`: **9 pass**, 0 fail, 14 assertions.
- `cd apps/web && bun test src/components/Calendar`: **16 pass**, 0 fail, 22 assertions.
- `cd apps/web && bun test src/features/campusMap`: **9 pass**, 0 fail, 23 assertions.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: **6 pass**, 0 fail, 8 assertions.
- `cd apps/web && bunx tsc --noEmit`: exactly **8 pre-existing errors** in `shops/page.tsx`, `GenericIssueFormDialog.tsx` x3, `IssueFormDialog.tsx` x3, and `worker.ts`; no errors in the changed code.
- `cd apps/web && bunx vite build`: **passed**, 6,410 modules transformed; existing Browserslist, Tailwind `@variants`, pdfjs eval, and chunk-size warnings were emitted.
- `cd services/api && bunx tsc --noEmit`: **0 errors**.
- `cd services/api && bun test`: **96 pass**, 0 fail, 178 assertions.
- `bunx prettier --check` on changed source, test, hook, and dictionary files: **passed**.
- `git diff --check`: **passed**.
- English/Chinese dictionary key-tree check: **1,173 keys each**, no differences.

## 6. Remaining untested or broken

- No authenticated browser acceptance test was run, including the deletion-confirmation UI, user-edited generated-event scenario, or identity transition.
- No live replication endpoint or production database behavior was checked.
- The baseline eight web type errors remain unchanged and unrelated.
