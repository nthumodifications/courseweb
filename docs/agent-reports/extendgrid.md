# Extended timetable grid

## Changes, file by file

- `apps/web/src/helpers/timetable.ts` — Added pure off-grid bound discovery, band sizing/clamping, clock formatting, and one continuous time-to-pixels mapping; removed the obsolete list selectors.
- `apps/web/src/helpers/timetable.test.ts` — Kept the strict containment classifier tests and added fixed-value tests for bounds, no-band output, boundary crossing, and both clamps.
- `apps/web/src/types/timetable.ts` — Added optional extended-hours geometry to `TimetableDim`.
- `apps/web/src/components/Timetable/Timetable.tsx` — Keeps all timetable data in overlap layout, adds conditional pre/late table bands and gutter clock labels, and passes one shared geometry to the overlay.
- `apps/web/src/components/Timetable/TimeslotHeader.tsx` — Renders the Sunday body cell when the Sunday column is present so extended weekend columns remain aligned.
- `apps/web/src/components/Timetable/TimetableSlotVertical.tsx` — Positions vertical blocks through the shared time mapping, offsets normal periods after the pre-band, and forces times on extended custom blocks.
- `apps/web/src/components/Timetable/TimetableSlotHorizontal.tsx` — Applies the equivalent shared geometry to horizontal mode and forces extended custom-block times.
- `apps/web/src/components/Timetable/TimetableOffGridSchedule.tsx` — Deleted the former stacked off-grid list component.
- `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` — Captures the single extended `Timetable` and no longer appends a separate list.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx` — Removed the old list usage; the main timetable now owns the bands.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — Removed the old list usage from legacy URL-shared previews.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` — Removed the old list usage from shared timetable views.
- `apps/web/src/dictionaries/en.json` — Removed the obsolete outside-timetable heading.
- `apps/web/src/dictionaries/zh.json` — Removed the matching obsolete Taiwan Traditional Chinese heading.

## Band rule and verification

The school grid remains 08:00–22:20. For custom slots, the existing classifier remains strict: a slot is a normal grid slot only when its complete interval is contained in that range. The earliest start before 08:00 creates the pre-dawn band; the latest end after 22:20 creates the late band. No band is rendered when no custom slot requires it.

Band height is `duration × school-grid pixels-per-minute`, clamped to a minimum of **48px** and a maximum of **240px**. The minimum keeps a short activity readable; the maximum prevents a very early activity from creating a large empty region. When a band is clamped, its local time scale is compressed to the clamped size so blocks remain inside the band and still use the same single coordinate mapping as the school rows. The normal school-grid segment always retains its measured pixels-per-minute scale.

### Requested findings

- **The previous separate off-grid list was wrong.** `Timetable` now renders conditional table bands in the same `<table>`, and the absolute overlay covers the expanded table. All three page surfaces and the PNG capture now render only `Timetable`; repository search found no live `TimetableOffGridSchedule` import or old dictionary key. The focused maths suite and Vite build verify the new imports and paths compile; no browser render was available.
- **A block must cross a boundary as one block.** `getTimetableTimeRangePosition(21:00, 23:30, geometry)` returns one range from 780px to 930px with size 150px for a fixed 860px school grid, rather than two pieces. The test passes, and both slot renderers use that range for one absolutely-positioned element.
- **Extended blocks must always show their clock time.** Both slot components show custom `HH:mm–HH:mm` when the custom slot is classified off-grid even when `preferences.display.time` is false. This is verified by the code path; no preference-toggle browser check was run.
- **The old classifier behavior must stay.** The original containment cases remain in `helpers/timetable.test.ts`; the file now passes 11 tests total, including the four new band tests.
- **Agenda, day cards, and timeline must continue chronological inclusion.** No code change was needed: those components continue to consume `getTimetableDataTimeRange`/the complete timetable data rather than the grid-only filter. This was source-traced and included in the successful web build; click-through and visual ordering were not browser-tested.
- **Shared and legacy views must stay coherent.** Main timetable, legacy URL view, server share view, and PNG capture all now rely on the same `Timetable` geometry. The build verifies their imports; live share rendering and PNG pixels were not inspected.
- **Mobile must remain reachable.** No layout or bottom-navigation clearance code was changed; the existing mobile bottom padding from the prior round remains in place, and the timetable keeps its existing overflow behavior. A 400px screenshot/scroll acceptance check was not possible without a browser session.

## Deliberate omissions

- No files outside the declared ownership were changed. Calendar, Alerts, Widgets, Today, layout, API, RxDB, date, and service files were left untouched.
- No new free-form persistence contract, cross-midnight storage behavior, migration, dependency, or environment variable was introduced.
- No browser server was started. Exact 400px layout, fixed-bottom-nav scroll reachability, shared-view interaction, preference toggling, and downloaded PNG pixel dimensions remain manual checks for the maintainer.

## Migration and maintainer steps

No migration, environment variable, dependency installation, or data conversion is required. The maintainer should open the timetable at 400px with activities at 06:15–07:30 and 21:00–23:30, toggle `display.time`, inspect shared/legacy views, and download a PNG to verify the visual output.

## Verification totals

- `cd apps/web && bunx tsc --noEmit` — **8 errors**, exactly the established pre-existing errors: `shops/page.tsx`, `GenericIssueFormDialog.tsx` ×3, `IssueFormDialog.tsx` ×3, and `worker.ts`; no timetable errors.
- `cd apps/web && bun test src/helpers/timetable.test.ts` — **11 pass**, 0 fail, 15 expectations.
- `cd apps/web && bun test src` — **51 pass**, 0 fail, 95 expectations, 8 files.
- `cd apps/web && bun test src/features/campusMap` — **9 pass**, 0 fail, 23 expectations.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts` — **6 pass**, 0 fail, 8 expectations.
- `cd apps/web && bunx vite build` — passed; 6,410 modules transformed. Existing Browserslist, Tailwind deprecation, PDF `eval`, and large-chunk warnings were emitted.
- `cd services/api && bunx tsc --noEmit` — **0 errors**.
- `cd services/api && bun test` — **96 pass**, 0 fail, 178 expectations.
- `git diff --check` — passed.
- Dictionary key comparison — **1,176 English / 1,176 Chinese**, identical key paths.

## Remaining unverified

No known new source or test failure remains. Browser-only responsive geometry, visual overlap at the 22:20 boundary, fixed-nav scroll clearance, shared-page interaction, display-preference behavior, and PNG pixel inspection remain unverified.
