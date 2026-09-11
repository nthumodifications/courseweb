# Extend timetable hours

## Changes, file by file

- `apps/web/src/helpers/timetable.ts` — Changed custom-slot classification to use start time (`grid`, `start`, or `end`), and added shared extended-band bounds, clock formatting, and time-to-pixel geometry.
- `apps/web/src/helpers/timetable.test.ts` — Replaced containment tests with fixed-value start-time tests and added extended-band, continuity, empty-region, and multi-slot coverage.
- `apps/web/src/types/timetable.ts` — Added optional extended-hours geometry to the shared timetable dimensions.
- `apps/web/src/components/Timetable/Timetable.tsx` — Keeps all slots in one overlay and grows the table with conditional pre-grid and late-grid bands.
- `apps/web/src/components/Timetable/TimeslotHeader.tsx` — Added Sunday cells so extended rows preserve all visible day columns.
- `apps/web/src/components/Timetable/TimetableSlotVertical.tsx` — Positions custom blocks through the continuous geometry and always shows times for blocks touching extended hours.
- `apps/web/src/components/Timetable/TimetableSlotHorizontal.tsx` — Applies the same continuous geometry and mandatory extended-hours time display to horizontal mode.
- `apps/web/src/components/Timetable/TimetableOffGridSchedule.tsx` — Deleted the rejected appended card-list renderer.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx` — Removed the normal timetable’s off-grid list render.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — Removed the legacy URL-share off-grid list render.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` — Removed the read-only shared off-grid list render.
- `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` — Makes PNG capture use the expanded timetable itself, without a second list.
- `apps/web/src/dictionaries/en.json` — Removed the now-dead off-grid-list heading key.
- `apps/web/src/dictionaries/zh.json` — Removed the matching Traditional Chinese off-grid-list heading key.

## Audit findings and verification

### Wrong containment classification

The prior implementation required `start >= gridStart && end <= gridEnd`, which incorrectly moved `21:00–23:30` out of the grid. `classifyCustomTimetableSlot` now checks only the start: 08:00 is grid, 22:20 is end, starts before 08:00 are start-region, and any start within 08:00–22:20 remains grid even when the end is later. The focused suite passed 11 tests / 15 expectations, including all requested concrete examples and an item with slots in all three regions.

### Out-of-hours list instead of timetable bands

The list component and every render site were removed. The table now conditionally adds one full-width start band and/or one full-width end band using the existing day columns and `BlankTimeslotBody`; no bands are emitted when no custom slot occupies an extended region. Overlay blocks use one continuous time-to-pixels interval, so `21:00–23:30` is one element across the 22:20 boundary. The normal timetable, legacy view, shared view, and PNG capture all use the same `Timetable` path. Agenda, day cards, and timeline already consume complete timetable data and were left on that shared data path.

### Hardcoded activity-list colours

The rejected list and its title key are gone. Extended band gutters use `text-muted-foreground`; cells use the existing `bg-muted` component; custom block text and borders continue to use the activity’s existing `getContrastColor` result. A final source-diff grep for forbidden hardcoded contrast literals returned no matches.

## Deliberate omissions and limitations

- I did not change Calendar, Alerts, Widgets, Today, services, layouts, storage, or any other out-of-scope path.
- I did not add cross-midnight custom-activity support; the existing editor/storage contract requires `end > start` on the same day.
- I did not run a browser screenshot or 400px acceptance session. Source geometry keeps the timetable inside the existing scroll container, and the existing bottom-nav clearance was not changed, but narrow visual wrapping and actual PNG pixels remain browser-unverified.
- I did not start a dev server. Therefore the documented cold `/zh/timetable` lazy-load path was not browser-tested.

## Migration and maintainer steps

No migration, environment variable, dependency, lockfile, or manual data conversion is required. The maintainer should perform the 400px visual check, confirm start/late blocks with `display.time` disabled, inspect the PNG, and click custom blocks in normal and shared views.

## Verification

- `bun test src/helpers/timetable.test.ts` — 11 pass, 0 fail, 15 expectations.
- `bun test src` — 65 pass, 0 fail, 131 expectations, 10 files.
- `bun test src/features/campusMap` — 9 pass, 0 fail, 23 expectations.
- `bun test src/hooks/syncedStorage.test.ts` — 10 pass, 0 fail, 22 expectations in this checkout.
- `services/api`: `node ../../node_modules/typescript/bin/tsc --noEmit` — 0 errors.
- `services/api`: `bun test` — 96 pass, 0 fail, 178 expectations.
- `apps/web`: installed TypeScript 5.4.4 direct invocation (`node ../../node_modules/typescript/bin/tsc --noEmit`) — exactly 8 pre-existing errors in `shops/page.tsx`, `GenericIssueFormDialog.tsx` x3, `IssueFormDialog.tsx` x3, and `worker.ts`; no timetable errors.
- `apps/web`: installed Vite 5.4.21 direct invocation (`node ../../node_modules/vite/bin/vite.js build`) — passed. Existing Browserslist, Tailwind, PDF `eval`, and chunk-size warnings were emitted.
- `bunx vite build` — passed, but Bunx resolved a transient Vite 8 tool in this worktree; the installed Vite 5 build above is the relevant repository-version check.
- Dictionary key trees — English and Traditional Chinese both 1,176 keys and identical.
- `git diff --check` — passed.
- `git status` — only the timetable source, tests, dictionaries, and this report are changed; no lockfile changed.

## Environment note

The exact requested `bunx tsc --noEmit` command hit Bun’s transient `typescript@latest` bundled-library panic (`lib.d.ts does not exist`) before typechecking. The installed repository TypeScript 5.4.4 invocation was used to establish the required exact eight-error baseline above.

## Remaining unverified or broken

No known new timetable type or test failure remains. Browser-only 400px layout, cold-route load timing, shared interaction, PNG pixels, and bottom-nav scroll reachability remain untested as stated above. The eight listed application type errors remain pre-existing.
