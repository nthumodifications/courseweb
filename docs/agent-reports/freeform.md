# Free-form clock times for custom timetable blocks

## Changes, file by file

- `apps/web/src/types/timetable.ts` — Replaced persisted `schedule` with `slots` containing numeric day plus stable `HH:mm` start/end strings, added Sunday, and added read-only legacy input types.
- `apps/web/src/hooks/syncedStorage.ts` — Added the single legacy-to-clock normalizer, validation, clamping-independent storage conversion, and malformed-record handling.
- `apps/web/src/hooks/syncedStorage.test.ts` — Added conversion and malformed-record tests; the suite now covers 6 tests.
- `apps/web/src/hooks/contexts/useUserTimetable.tsx` — Normalizes `timetable_custom_items` on read and writes the normalized value back through synced storage; setter inputs are normalized too.
- `apps/web/src/helpers/timetable.ts` — Added clock-minute geometry, grid clamping, mixed course/custom overlap columns, and custom-item slot generation from clock ranges.
- `apps/web/src/helpers/timetable_course.tsx` — Made custom-slot drawer keys stable for multiple same-day clock slots.
- `apps/web/src/components/Timetable/Timetable.tsx` — Kept the NTHU period table/course layout and added Sunday plus shared mixed-overlap fraction calculation.
- `apps/web/src/components/Timetable/TimetableSlotVertical.tsx` — Positions custom blocks by clock-minute percentage over the period grid, clamps/marks out-of-range blocks, and gives them a minimum legible height.
- `apps/web/src/components/Timetable/TimetableSlotHorizontal.tsx` — Adds the equivalent horizontal clock overlay, overlap columns, clamping, marking, and minimum width/height.
- `apps/web/src/components/Timetable/TimetableItemDrawer.tsx` — Replaced period selectors with native time inputs and localized end-after-start validation.
- `apps/web/src/components/Timetable/TimetableSidebar.tsx` — Creates new custom items with a clock-time slot.
- `apps/web/src/components/Timetable/TimetableAgenda.tsx` — Displays custom clock ranges and sorts each day by actual start time.
- `apps/web/src/components/Timetable/TimetableDayCards.tsx` — Displays clock ranges and includes Sunday custom blocks.
- `apps/web/src/components/Timetable/TimetableTimeline.tsx` — Sorts by actual start time, uses custom ranges, mixed overlap columns, and marks blocks clipped to the timeline range.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — Accepts legacy/new URL-share custom payloads and normalizes them before importing.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` — Normalizes legacy/new API-share custom items before importing them locally.
- `apps/web/src/hooks/useTimetableShare.ts` — Types share payloads as accepting the new shape and the read-only legacy shape.
- `services/api/src/timetable-share.ts` — Validates new clock slots, requires end after start, and keeps the old `schedule` item schema accepted for compatibility.
- `apps/web/src/dictionaries/en.json` — Added English time-input, validation, Sunday, and clipped-block strings.
- `apps/web/src/dictionaries/zh.json` — Added matching Taiwan Traditional Chinese strings and key paths.

## Findings and verification

### Period-constrained custom model

The old `schedule: string[]` model is gone from the persisted `CustomTimetableItem`. New editor saves produce, for example, `{ slots: [{ day: 0, start: "18:30", end: "21:00" }] }`; storage remains keyed by semester under `timetable_custom_items`. The model and compiler gates verify the contract, while browser persistence/reload could not be tested without a browser session.

### Legacy local data migration

Conversion happens in `apps/web/src/hooks/syncedStorage.ts` (`normalizeCustomTimetableItem` / `normalizeCustomTimetableStorage`) and is invoked by the `useUserTimetable` read path. A legacy `M1M2` entry becomes `{ day: 0, start: "08:00", end: "09:50" }`; contiguous periods are represented by the first period's start and last period's end, preserving the former block including the established timetable gap. The provider writes the normalized map back through `setStoredCustomItems`.

Malformed legacy entries/tokens are ignored. Valid tokens in a mixed entry survive; an item with no convertible slots is omitted because it cannot be rendered safely. The new-storage path also filters invalid day/time/end-order slots. `syncedStorage.test.ts` covers both a valid `M1M2` conversion and a malformed/partially-valid record, and the test suite passes 6/6.

### Arbitrary rendering and overlap behavior

The implementation uses the requested overlay approach. Course rows remain period-indexed and retain their existing row occupancy behavior. Custom blocks convert `HH:mm` to a percentage of the known `08:00`–`22:20` grid range. `addTimetableFractions` gives every overlapping course/custom block a side-by-side column, including custom blocks crossing a course, so the rendered elements remain separately readable and clickable in the DOM. Blocks outside the displayed range are pinned to the nearest edge, given a minimum visible size, and marked with `↕` plus a localized title. Vertical/horizontal slot components use a 24px minimum custom height; the timeline uses a 20px minimum block height.

A direct geometry trace produced two columns (`fraction: 2`, indices 1 and 2) for an 08:00 course overlapped by an 08:30–09:15 custom block. Exact pixel placement and pointer interaction were not browser-tested.

### Other render surfaces

Agenda, day cards, and timeline display real custom start/end strings and sort by actual start minutes. The normal timetable used by PNG download receives the same overlay data, so the downloaded image path uses the new geometry. Normal API share pages and legacy query share pages both use the same normalizer and timetable helper.

### Share compatibility trace

`services/api/src/timetable-share.ts` now accepts either the new `slots` union member or the old `schedule` union member for create/update validation. For an old stored `courseNotes` value such as `{"courseNotes":{"course-1":"note"},"customItems":{"11410":[{"id":"job","title":"Job","color":"#123456","schedule":["M1M2"]}]}}`, `parseShareMetadata` still recognizes the wrapper and returns the old custom item unchanged. The web share/view path then passes it through `normalizeCustomTimetableItem`, producing the clock slot above before `createTimetableFromCustomItems`; a direct runtime trace returned one Monday custom slot with `08:00`–`09:50`. Import paths normalize before writing local storage. No live share HTTP request was available in this worktree.

## Deliberate omissions

- Courses were not refactored to minute-based geometry; the period grid and course rendering remain intact.
- No Calendar-owned files, ICS endpoint, RxDB schema, dependency, lockfile, environment variable, or database migration was changed. Custom activities therefore remain timetable/share data, not calendar events.
- `TimetableDots` and other non-listed consumers from the prior report were not changed because they are not wired as custom-item render surfaces in the requested flow.

## Migration and maintainer steps

No manual data migration, environment variable, Prisma migration, or dependency installation is required. Deploy the web app for the storage/editor/render changes and the API service for the updated share request validation. Existing local/synced period records migrate when the timetable provider reads them and are written back in the new shape. Existing share rows are read compatibly; they are not rewritten in the database.

## Verification

- `cd apps/web && bunx tsc --noEmit` — 8 errors, exactly the established baseline (`shops/page.tsx`, six Forms errors, and `worker.ts`); no timetable error.
- `cd services/api && bunx tsc --noEmit` — 0 errors.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts` — 6 pass, 0 fail.
- `cd apps/web && bun test src/features/campusMap` — 9 pass, 0 fail.
- `cd services/api && bun test` — 96 pass, 0 fail.
- `cd apps/web && bunx vite build` — passed; only existing Browserslist/Tailwind/PDF eval/chunk-size warnings were emitted.
- English/Chinese dictionary key-path check — 1,133 paths each, identical.
- `git diff --check` — passed.
- Direct Bun traces — legacy storage conversion and legacy share-to-render normalization returned the expected clock slots; mixed overlap returned two layout columns.

## Not verified without a browser

No browser session, visual screenshot, downloaded PNG inspection, native `<input type="time">` interaction, localStorage reload, live API share request, or click-through test was run. These are the remaining manual checks for exact responsive appearance, PNG pixel output, and pointer behavior at narrow overlapping columns.
