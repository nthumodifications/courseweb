# Timetable sync data-loss fix: scoped report

Branch: `fix/timetable-sync-data-loss`
Base checked: `origin/main` (`5be81fb80fa528dd0de517026d46c737cbc49540`)

## Findings and decisions

The original sync hook is intentionally restored byte-for-byte from
`origin/main`. Its contract remains `[value, setter, settled, error]`
(`apps/web/src/hooks/useSyncedStorage.tsx:39-43,280-297`). The hook work from
the adversarial review, including the storage adapter, schema checks, backup
keys, dismissal markers, and anonymous migration controls, is not part of this
branch. `services/secure-api/src` is also unchanged.

The old credit sort built a new list from resolved `/course` results and then
replaced the semester, which could delete unresolved IDs and overwrite a
concurrent add (`apps/web/src/components/Timetable/TimetableSidebar.tsx:131-143`).
The old import handlers replaced the complete course/custom-item maps
(`apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx:101-146`), and
the old course list treated any temporary empty result as “No Courses.”

This branch keeps the repair small:

- `apps/web/src/helpers/timetable.ts:17-95` contains pure additive import,
  unresolved-ID, credit-order, and guarded `semester_1121` migration helpers.
  Resolved IDs are sorted by credits; unresolved stored IDs remain in their
  original order. Imports preserve existing course IDs, colours, and custom
  items.
- `TimetableSidebar.tsx:131-143` computes inside the functional updater from
  the current stored map and refuses to sort while the course query is loading
  or failed. `TimetableCourseList.tsx:395-410` uses a functional updater that
  returns the whole map for drag reorder.
- Both timetable import routes use additive functional updates for all three
  maps (`timetable/view/page.tsx:101-146` and
  `timetable/share/[shareId]/page.tsx:106-139`).
- `useUserTimetable.tsx:393-409` exposes unresolved IDs, while
  `TimetableCourseList.tsx:347-489` renders separate loading, failed, empty,
  and unresolved-count states. Stored IDs are never removed because the API
  failed to resolve them.
- The provider forwards the original hook’s course, colour-map, and custom-item
  errors (`useUserTimetable.tsx:637-664`). `LiveTimetableSync.tsx:43-54` now
  returns before publishing while the personal KV read is unsettled or
  errored.
- Legacy `semester_1121` migration parses defensively, adds every valid ID
  without deleting an existing semester, and removes the legacy key only after
  every migrated ID is present (`useUserTimetable.tsx:440-484`).
- `services/secure-api/docker-compose.yaml:16` passes the existing
  `FIREBASE_SERVICE_ACCOUNT` variable.
- English and Traditional Chinese dictionaries add only the three course-state
  messages and update the import description; their leaf-key trees remain
  identical.

## Issue disposition

This plausibly addresses the reported `sortByCredits` deletion and the
Import-all/Import-semester replacement deletion: the operations now merge with
the current functional state and retain unresolved IDs. It also addresses the
“looks empty” report caused by a loading or failed `/course` request by making
those states explicit. These are local code-path repairs; no historical user
account reproduction was available.

Anonymous-to-account handoff is deliberately not addressed. There is no
anonymous prompt, automatic reassignment, or new marker protocol here. That
larger work remains on the local `fix/timetable-sync-hardening` branch, which
was not modified.

Cross-device deletion and ordering are deliberately not addressed. The
existing snapshot/merge contract has no deletion information, so absence in an
array must not be interpreted as a remove. A follow-up tombstone design should
version the record and retain idempotent `add`/`remove` operations with
`opId`, per-device sequence, Lamport ordering, and separately deterministic
predecessor/order operations; old `merge: true` clients must be negotiated
rather than silently reinterpreted. This note is proposal-only and no such
protocol is implemented here.

Storage hardening is deliberately not addressed. The hook files are exactly
the `origin/main` versions, so failed-storage recovery, semantic wrapper
validation, backup retention, and migration dismissal durability remain
follow-up work on `fix/timetable-sync-hardening`; no new storage API or
dependency was added.

## Maintainer signed-in click checklist

Use a real account and do these checks in a browser; do not use scripted
production writes.

1. Open the timetable with a non-empty account timetable. During the `/course`
   request, confirm the list says loading; after a successful response confirm
   the courses render. Block or fail that request and confirm the failed state
   is shown instead of “No Courses.” Restore the request and confirm the list
   recovers.
2. Add a stored course ID that the `/course` response does not resolve. Confirm
   the visible unresolved count, the ID remains in local storage, and a later
   refresh does not remove it.
3. While the course query is loading or failed, confirm Sort by credits is
   disabled. After success, sort a semester containing resolved and unresolved
   IDs and confirm the resolved IDs reorder while the unresolved IDs retain
   their prior relative order.
4. Drag-reorder two courses, then add another course and refresh. Confirm the
   semester map still contains every course and the dragged order.
5. Open a shared timetable view with existing local courses, colours, and a
   custom item. Test Import all and Import this semester separately; confirm
   existing entries remain and imported courses, colours, and custom items are
   present. Repeat the semester import from `/timetable/share/[shareId]`.
6. If the account owns a live share, throttle the personal KV read. Confirm no
   live-share update is sent while the read is pending or failed; after a
   successful read and a real timetable edit, confirm the update is sent.
7. At approximately 390px wide, repeat the state notices and import actions;
   confirm the messages and buttons remain readable and tappable.

## Verification

Baseline before editing:

- `bun run --cwd apps/web type-check`: failed with the known 9 diagnostics at
  the four unrelated form, dining, and worker locations.
- From `apps/web`, `bun test src/hooks src/helpers src/components`: 83 passed,
  0 failed, 157 expectations, 10 files. This was the pre-restoration WIP suite;
  the final branch restores the hook tests to `origin/main` as required.

After editing:

- From `apps/web`, `bun test src/hooks src/helpers src/components`: 70 passed,
  0 failed, 132 expectations, 11 files.
- From `apps/web`, `bun test src/helpers/timetable.test.ts`: 17 passed,
  0 failed. `bun test src/components/Timetable/timetable_render_guard.test.tsx`:
  1 passed, 0 failed, bounded below 30 renders, and reached the empty state.
  The guard mounts the real timetable provider and course list with `jsdom`;
  no maximum-update-depth or too-many-renders error occurred.
- `bun run --cwd apps/web type-check`: still the same 9 baseline diagnostics;
  no changed timetable/helper diagnostic was added.
- `bun run --cwd apps/web build`: passed; Vite transformed 7,252 modules and
  generated the PWA service worker. Existing Browserslist, Tailwind, pdfjs
  `eval`, and large-chunk warnings remain.
- `bun run type-check:test` from `apps/web`: failed on existing test-only
  diagnostics in calendar, campus-map, laundry, live-sync fixture typing, and
  the restored `syncedStorage.test.ts`; none pointed at the new render guard,
  timetable helpers, or provider source.
- `bunx prettier --write` and `bunx prettier --check` passed for all
  task-owned source, test, dictionary, compose, and report files.
- The dictionary leaf-key check reported `en=1651`, `zh=1651`, `onlyEn=[]`,
  and `onlyZh=[]`.
- Scoped `bunx eslint` was attempted for changed web files. It could not start
  because the checked-out shared config references unavailable
  `@typescript-eslint/recommended`; `bun run lint` was not run.
- A local server was started with
  `bun run --cwd apps/web dev -- --port 5186 --strictPort` and stopped after
  read-only checks. `GET http://localhost:5186/zh/timetable` returned 200,
  9,653 bytes, and the root mount. The dev-proxied public course read
  `GET http://localhost:5186/__api/course?courses=11510AES%20510100` returned
  200 with 669 bytes of real course JSON. No POST, PUT, or DELETE was sent to
  production. A headless-browser screenshot/console run was not needed because
  `jsdom` was available for the required mounted render guard; the 390px
  visual check remains maintainer work.
- `git diff --check` passed after this report was rewritten. The three hook
  files compare identical to `origin/main`, and `services/secure-api/src` has
  no diff.

## Open questions

1. Run the signed-in checklist, especially failed `/course` reads, live-share
   gating, and both import routes.
2. Confirm whether the existing snapshot contract should be replaced by the
   tombstone/order protocol before promising cross-device deletions or order.
3. Schedule the separate hardening-branch review for storage failures and
   anonymous handoff; this branch intentionally does not claim those fixes.


## Final review round (before merge)

A last adversarial review found three things, all addressed:

- **Imports.** An earlier version of this branch changed "Import all" and "Import this semester" from replace to merge. The buttons' own text says they overwrite, so replacing is the intended behaviour; both import pages are back to exactly what `main` does. Whether import should offer a merge is a product decision, not a bug fix.
- **Legacy `semester_1121` migration.** It no longer removes the old key at all. It imports the list once and records a `semester_1121_migrated` marker; if storage is unavailable it simply tries again on a later visit. It runs once per page load instead of on every render.
- **Live share gating.** Publishing is held back only while the read of the account's course list has failed, not for a colour-map or custom-item read failure, and readiness flags are otherwise as on `main`.

Also: the "N courses couldn't be loaded" notice is hidden while courses are being refetched, so adding a course does not flash it.
