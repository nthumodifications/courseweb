# Off-grid timetable activities

## Changes, file by file

- `apps/web/src/helpers/timetable.ts` — Added the pure `classifyCustomTimetableSlot` containment classifier and grid/off-grid data selectors; removed `clampTimeRange` and its minimum-height clipping behavior.
- `apps/web/src/helpers/timetable.test.ts` — Added fixed-value tests for inside, partial overlap, entirely-before/after, boundary-touching, and a multi-slot item that splits between grid and schedule.
- `apps/web/src/components/Timetable/Timetable.tsx` — Filters off-grid custom slots before grid layout, overlap fractions, and weekend-column detection.
- `apps/web/src/components/Timetable/TimetableSlotVertical.tsx` — Uses the already-classified custom range directly; removed clamping, clipping title text, and the `↕` marker.
- `apps/web/src/components/Timetable/TimetableSlotHorizontal.tsx` — Same direct-range/clipping removal for horizontal timetable blocks.
- `apps/web/src/components/Timetable/TimetableTimeline.tsx` — Removed timeline clamping and `↕`; expands the timeline bounds to contain actual activity times.
- `apps/web/src/components/Timetable/TimetableOffGridSchedule.tsx` — Added the stacked, localized weekday schedule with chronological rows, color swatches, mandatory `HH:mm–HH:mm`, venue/note text, 400px-friendly layout, and the existing custom-item drawer trigger.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx` — Renders the off-grid schedule directly below the main timetable grid.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — Keeps URL-shared preview data coherent by rendering its off-grid schedule below the grid.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` — Renders the same schedule for shared views, read-only like the existing shared grid blocks.
- `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` — Includes the off-grid schedule in the PNG capture element and lets the capture grow beyond the old fixed height.
- `apps/web/src/dictionaries/en.json` — Added the English off-grid schedule heading and removed the obsolete clipping label.
- `apps/web/src/dictionaries/zh.json` — Added the matching Taiwan Traditional Chinese heading and removed the obsolete clipping label.
- `apps/web/src/layouts/MainLayout.tsx` — Updated the mobile content bottom padding to use `--bottom-nav-height` plus the safe-area inset, so the fixed bottom navigation cannot cover the final timetable rows.

## Findings and verification

### Containment and stacked schedule

The rule is strict full containment: a custom slot is `grid` only when `start >= timetableGridStart` **and** `end <= timetableGridEnd`; otherwise it is `off-grid`. With the established timetable range, `08:00–09:00` and `21:20–22:20` fit, while `07:30–08:30`, `21:30–22:30`, `06:00–07:30`, and `23:00–23:30` are off-grid. This deliberately sends a partially overlapping slot to the schedule rather than showing a truncated grid block.

Classification is per slot. The test item with `10:00–11:00` and `06:00–07:30` produces [`grid`, `off-grid`], so one custom item can render in both surfaces.

`TimetableOffGridSchedule` groups by numeric Monday-through-Sunday order and uses the same localized `date-fns` weekday labels as the timetable header. I chose plain chronological order within each day rather than adding separate before/after sections. It returns `null` before rendering any heading when there are no off-grid slots. Its time line ignores `preferences.display.time`, so times remain visible even when grid-block times are hidden. Rows use `TimetableCustomItemDrawer`, not a second editor.

Verification: `bun test src/helpers/timetable.test.ts` — 7 pass; `bun test src` — 47 pass. The source path also confirms the main, URL-share, server-share, and PNG capture paths all pass the same `timetableData` through the classifier/schedule.

### Clamping hack and other surfaces

`clampTimeRange`, the clipping dictionary key, and every `↕` reference are gone from `apps/web/src`. The vertical and horizontal grid components now receive only fully contained custom slots from `Timetable`. Agenda and day cards were already consuming the complete timetable data and sorting with `getTimetableDataTimeRange`, so they were left unchanged and continue to include off-grid activities inline. The timeline was updated to expand around real data instead of clipping it to its former 07:00–22:00 window.

Verification: repository search found no `clampTimeRange`, `clipped_label`, or `↕` references; `git diff --check` passed. Agenda/day-card/timeline click-through and visual ordering were not browser-tested.

### PNG and shared views

The PNG path now places the non-editable schedule inside the same `ref` passed to `html-to-image`, and shared views render the same schedule below their grid. Vite build success verifies the imports and render paths compile. I did not run an actual browser download or inspect PNG pixels, so exact image dimensions and visual capture behavior remain unverified.

### Mobile scroll reachability

Source tracing found the fixed `BottomNav` uses `h-[5rem]` and a high stacking layer, while the mobile page content is the scrolling content under `SidebarInset`. The content wrapper previously used a literal `pb-[5rem]`; it now reserves `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))`, tied to the shared nav-height token and safe-area inset. This keeps the last grid rows scrollable without hiding or moving the fixed navigation.

Verification: the changed layout builds and type-checks without new errors. I could not run a browser session or a 400px screenshot/scroll acceptance check in this worktree, so the final visual reachability is not claimed as browser-verified.

## Deliberate omissions

- `apps/web/src/components/Timetable/TimetableAgenda.tsx` and `TimetableDayCards.tsx` needed no code change because they already include custom slots without applying the grid range.
- No changes were made to `types/timetable.ts`, `timetable_course.tsx`, or `useUserTimetable.tsx`; the existing free-form slot contract and drawer API were sufficient.
- No Calendar, Widgets, Today, API service, RxDB, schema, migration, dependency, lockfile, or deployment configuration was changed.
- The established editor/storage contract requires `end > start`, so cross-midnight input such as `23:00–01:00` remains unsupported by the pre-existing model. Same-day late activities such as `22:00–23:30` are classified and displayed correctly by this change. Supporting cross-midnight slots would require a broader storage/editor contract change outside this task's owned paths.

## Migration and maintainer steps

No migration, environment variable, dependency installation, or manual data conversion is required. Existing custom slots are classified at render time. The manager should perform the browser checks at 400px, click an off-grid row into the existing drawer, toggle `display.time` for grid blocks, and inspect a downloaded PNG.

## Verification totals

- `cd apps/web && bunx tsc --noEmit` — exactly 8 existing errors: `shops/page.tsx`, `GenericIssueFormDialog.tsx` x3, `IssueFormDialog.tsx` x3, and `worker.ts`; no new timetable errors.
- `cd services/api && bunx tsc --noEmit` — 0 errors.
- `cd apps/web && bun test src` — 47 pass, 0 fail, 88 expectations, 8 files.
- `cd apps/web && bun test src/features/campusMap` — 9 pass, 0 fail.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts` — 6 pass, 0 fail.
- `cd services/api && bun test` — 96 pass, 0 fail, 178 expectations.
- `cd apps/web && bunx vite build` — passed; only existing Browserslist, Tailwind deprecation, PDF `eval`, and chunk-size warnings were emitted.
- English/Chinese dictionary key paths — 1,177 each, identical.
- `git diff --check` — passed.

## Remaining unverified or broken

No known new code error remains. Browser-only responsive layout, drawer interaction, preference interaction, timeline rendering, PNG pixels, local persistence reload, and cross-midnight activity support remain unverified or deliberately outside scope as described above.
