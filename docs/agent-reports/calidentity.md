# Calendar identity and replication report

## 1. Changes by file

- `apps/web/src/config/rxdb.tsx`: made the anonymous store retain the legacy `nthumods-calendar` name, derived authenticated database names from a stable subject-scoped hash, added the version-2 `courseId` field, added version-1/version-2 migrations with complete required-field backfills, and made `RxDBProvider` switch/unmount consumers on identity changes.
- `apps/web/src/components/Calendar/calendar_hook.tsx`: gated event and timetable replication on the actual `calendar` scope, scoped replication identifiers to the subject database, checked HTTP failures, exposed combined replication status/error/local-only state, normalized legacy pulled event documents, and rendered a quiet localized status badge.
- `apps/web/src/components/Header.tsx`: changed “clear local data” to remove the current identity-scoped database, including replication checkpoints and metadata.
- `apps/web/src/dictionaries/en.json`: added English replication-status strings.
- `apps/web/src/dictionaries/zh.json`: added Traditional Chinese (Taiwan) replication-status strings with the matching key tree.
- `apps/web/src/config/rxdb.test.ts`: added pure tests for identity naming, scope-token recognition, and the version-2 migration backfill.
- `docs/agent-reports/calidentity.md`: this report.

## 2. Findings and verification

### Audit finding: events were globally readable across accounts

The database now remains `nthumods-calendar` only for anonymous data. An authenticated subject gets a separate stable database, for example `user-A` maps to `nthumods-calendar-055392a411dab57d` and `user-B` maps to `nthumods-calendar-0853975d10dab3ea`. Both `events` and `timetablesync` therefore live in the identity-specific database, so their queries cannot see another account’s collection. Replication metadata is also isolated by both database name and an identifier containing that name.

`RxDBProvider` derives the name from `auth.isAuthenticated` and `user.profile.sub`. During a change, the provider passes no database and renders no consumers until the new database is ready; this prevents the previous collection from remaining on screen for a render. The old database is closed, and the calendar hook cleanup cancels its replication states.

The anonymous policy is deliberate: anonymous events stay in the anonymous store and are not automatically adopted by the first account that signs in. This avoids attributing one shared machine’s anonymous events to the next account. The existing legacy anonymous database is migrated in place, so those events are retained rather than discarded. `getCalendarDatabaseName(null)` returns `nthumods-calendar`; distinct subject inputs return distinct deterministic names. This is verified by the identity tests and the concrete name trace above; no authenticated browser session was available for runtime verification.

Logout behavior is now safe for the default “keep local data” path: account A’s database remains on disk, but the provider switches to the anonymous database and account B later opens account B’s database. If “keep local data” is unchecked, `database.remove()` deletes account A’s events, timetable data, replication checkpoints, and replication metadata before logout. This is source-traced; the actual OIDC sign-out and shared-browser transition were not browser-tested.

### Audit finding: the event migration did not backfill required fields

The events schema is version 2. It requires nullable `courseId` and has a target-version-2 migration strategy. The version-1 strategy is retained for older schemas, and both strategies use the same complete normalization logic for `actualEnd`, `color`, `tag`, `details`, `excludedDates`, `parentId`, and the other required event fields. Version 2 adds `courseId: null` for hand-made/legacy events. Pulled server documents are normalized as well, so pre-version-2 server records do not fail the new required-field validation.

`bun test src/config/rxdb.test.ts` passed 4 tests / 14 assertions, including a document missing `actualEnd`, `color`, `tag`, and `courseId` and a document with existing values plus an invalid exclusion. The test confirms missing `actualEnd` becomes the event end, missing color/tag receive defaults, and missing course ID becomes `null`.

### Audit finding: replication failures were console-only and scope-less tokens replicated

The hook now exposes `replicationStatus` (`idle`, `syncing`, `error`, or `not-authorised`), `replicationError`, and `replicationIsLocalOnly` through the calendar context. It checks the OIDC `user.scope` token list before constructing either replication state. A token such as `openid profile planner` never starts event or timetable replication and reports `not-authorised`; `openid profile calendar planner` is accepted. Non-OK push/pull responses are thrown, with 401/403 classified as `not-authorised` and other failures as `error`. The status streams observe activity, successful send/receive, and errors, and subscriptions are cleaned up with replication cancellation.

The provider renders a small `role="status"` badge. It says local-only for anonymous events, syncing during active replication, and gives localized error/not-authorised messages when syncing cannot proceed. New UI strings exist in both dictionaries, whose key trees were checked equal at 1,281 keys. The source builds and typechecks without new errors; no browser or deliberately unreachable endpoint run was performed.

## 3. Timetable item 3 deliberately deferred

The schema now accepts and persists `courseId`, and the existing converter already emits `courseId: t.course.raw_id`. Full timetable reconciliation was not implemented. The required acceptance/reconciliation flow is in `Calendar.tsx`, which is outside this agent’s ownership boundary, and the provider does not receive a reliable “current account timetable KV has finished reconciling” signal. Implementing deletion from this hook could delete account B’s generated events while account A’s stale timetable data was still visible during an identity transition.

Concrete follow-up plan:

1. In the timetable sync owner, build the current generated event set for every current semester, including an empty set, and union current semester keys with previously synced keys so dropped courses, emptied semesters, and removed semesters are visited.
2. Read all persisted events with a non-null `courseId`; delete generated event IDs absent from the current generated set, and upsert every current generated event so time, venue, title, and color changes are reconciled. Keep hand-made events (`courseId: null`) untouched.
3. Await all deletes/upserts before recording the timetable checkpoint. A changed timetable must not be marked handled while an event write is still pending.
4. Delay destructive reconciliation until the current account’s synced timetable data is settled, and add pure tests for dropped-course, changed-slot, empty-semester, and removed-semester cases.

The exact type change needed from the owner of `calendar.types.ts` is:

```ts
// Current:
courseId?: string;
// Needed to match the persisted schema and hand-made null policy:
courseId?: string | null;
```

I did not edit that owned-by-another-agent file.

## 4. Migration, environment, and maintainer steps

- No new environment variable, package, lockfile, server migration, or deployment step is required.
- Opening the existing anonymous `nthumods-calendar` IndexedDB database automatically runs the RxDB schema migration from version 1 to version 2. Authenticated databases are new subject-scoped stores and start at version 2.
- Existing pre-change global event data is intentionally retained in the anonymous store and is not auto-adopted by an account. This policy should be documented in product help if anonymous events are exposed to users.
- The maintainer should apply the `calendar.types.ts` nullable union above and implement the four-step reconciliation plan in the owner-controlled timetable acceptance path.

## 5. Verification totals

- `cd apps/web && bun test src/config/rxdb.test.ts`: 4 pass, 0 fail, 14 assertions.
- `cd apps/web && bunx tsc --noEmit`: exit 1 with exactly 8 pre-existing errors (shops, GenericIssueFormDialog x3, IssueFormDialog x3, worker); no errors in owned changes.
- `cd apps/web && bunx vite build`: passed; 6,969 modules transformed.
- `cd apps/web && bun test src/features/campusMap`: 9 pass, 0 fail.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: 4 pass, 0 fail.
- `cd services/api && bunx tsc --noEmit`: 0 errors.
- `cd services/api && bun test`: 96 pass, 0 fail, 178 assertions.
- `bunx prettier --check` on all changed source, test, and dictionary files: passed.
- English/Chinese dictionary key-tree check: identical, 1,281 keys each.

## 6. Remaining untested or broken

- No authenticated browser acceptance test was run. In particular, the fresh-anonymous, anonymous-sign-in, A-logout-keep/B-sign-in, A-logout-clear, scope-less-token, and unreachable-endpoint transitions are source-traced rather than browser-observed.
- No live secure-api replication endpoint or Firestore behavior was checked.
- Full timetable event reconciliation remains a scoped follow-up as described above.
- The baseline web typecheck still reports its established 8 unrelated errors.
