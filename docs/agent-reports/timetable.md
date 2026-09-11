# Timetable custom blocks report

## Changes, file by file

- `apps/web/src/types/timetable.ts` — Added `CustomTimetableItem`, its per-semester storage type, supported day constants, and the optional custom-item marker on timetable slot data.
- `apps/web/src/hooks/syncedStorage.ts` — Added a merge helper that unions custom items by id and lets local edits win, without changing course merging.
- `apps/web/src/hooks/contexts/useUserTimetable.tsx` — Added the `timetable_custom_items` synced store, custom-item CRUD/colour handlers, safe defaults, and `fontSize`/`fontFamily` timetable preferences with old-preference normalization.
- `apps/web/src/helpers/timetable.ts` — Converts course-compatible schedule strings into custom slots and combines courses plus custom items for the timetable.
- `apps/web/src/helpers/timetable_course.tsx` — Uses the existing responsive drawer pattern for custom-slot editing and keeps shared-view custom slots read-only when requested.
- `apps/web/src/components/Timetable/TimetableItemDrawer.tsx` — Added the responsive add/edit form for title, short code, venue, note, days, period range, and the existing Compact colour picker.
- `apps/web/src/components/Timetable/TimetableSidebar.tsx` — Added activity creation, per-item colour picking, edit, and delete controls beside the course list.
- `apps/web/src/components/Timetable/TimetableSlotVertical.tsx` — Renders custom blocks with contrast text, a dashed border, an activity icon, font preferences, and bounded text wrapping.
- `apps/web/src/components/Timetable/TimetableSlotHorizontal.tsx` — Added the equivalent custom-block rendering and appearance controls for horizontal layout.
- `apps/web/src/components/Timetable/TimetableDayCards.tsx` — Renders custom items, including Saturday, with the activity marker and appearance preferences.
- `apps/web/src/components/Timetable/TimetableAgenda.tsx` — Renders custom items, notes, dashed distinction, and appearance preferences.
- `apps/web/src/components/Timetable/TimetableTimeline.tsx` — Renders custom items on the clock timeline with the activity marker, dashed distinction, and appearance preferences.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/page.tsx` — Supplies the active semester's custom items to the normal timetable grid.
- `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` — Supplies custom items to the hidden timetable used for downloaded PNG generation.
- `apps/web/src/components/Timetable/ShareTimetableDialog.tsx` — Includes custom items for selected semesters in API share creation, including custom-only semesters.
- `apps/web/src/components/Timetable/ShareSyncTimetableDialog.tsx` — Adds the synced custom-item map to legacy query share URLs before shortening them.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` — Renders shared custom items and imports them with a shared semester.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — Renders and imports custom items from legacy query share URLs.
- `apps/web/src/hooks/useTimetableShare.ts` — Extended the client share contract with optional per-semester custom items.
- `services/api/src/timetable-share.ts` — Validates and returns `customItems`; stores them in a backward-compatible envelope in the existing `courseNotes` JSON column, preserving old plain course-note records.
- `apps/web/src/app/[lang]/(mods-pages)/settings/TimetablePreferences.tsx` — Added enum controls for slot font size and safe font family.
- `apps/web/src/dictionaries/en.json` — Added English custom-item and appearance-control strings.
- `apps/web/src/dictionaries/zh.json` — Added Taiwan Traditional Chinese equivalents with the same key tree.
- `apps/web/src/components/Header.tsx` — Clears custom-item local storage when the user chooses to remove local data on logout.

## Data model and migration behaviour

The local storage key is `timetable_custom_items`, with this shape:

```ts
Record<string, CustomTimetableItem[]>

type CustomTimetableItem = {
  id: string;
  title: string;
  shortCode?: string;
  venue?: string;
  note?: string;
  color: string;
  schedule: string[];
};
```

Each `schedule` entry uses the existing course `times` vocabulary, for example `M1M2` or `W3W4`; day letters are `M/T/W/R/F/S` and periods are the existing `scheduleTimeSlots` tokens. The grid has fixed NTHU period rows and cannot place arbitrary clock times, so the editor deliberately falls back to period ranges rather than pretending to support free-form clock coordinates.

An existing user with saved courses but no custom-item key reads `{}` through `useSyncedStorage`; course storage and merge behaviour are unchanged. Existing display-preference records missing the new fields receive `fontSize: "sm"` and `fontFamily: "system"`, then are written back through the existing `timetable_display_preferences` key. No RxDB schema change was made.

## Sharing and deliberate omissions

The normal API share and full share page include custom items by default. The legacy `timetable/view` URL used by `ShareSyncTimetableDialog` also carries them in a `customItems` query parameter. The server does not need a Prisma/database migration: it wraps new metadata in the existing `courseNotes` column and unwraps both old and new records.

The calendar ICS endpoint remains course-only, and Calendar-owned components were not edited as required. Snapshot `savedCourses` remains the pre-existing course-only storage contract; the nested live share response includes `customItems` for a future Calendar consumer. The community and group preview pages, `TimetableDots`, and other non-listed consumers were not changed. These are intentionally not claimed as custom-item render surfaces. No arbitrary clock-time support was added.

## Verification

- `cd apps/web && bunx tsc --noEmit` — 8 errors, exactly the established baseline: one shops error, six forms errors, and one `worker.ts` error. No new timetable errors.
- English and Chinese dictionary JSON parsed successfully and have identical key paths (845 each).
- `git diff --check` completed without whitespace errors.
- Prettier completed successfully on all changed source, JSON, and service files.
- No new dependencies, environment variables, or RxDB/database migrations are required. The maintainer must deploy the web app and the API service for share-payload changes to be available.
- No browser session, visual screenshot, live share API request, or downloaded PNG was run. Contrast is computed with the existing `getContrastColor`; the largest font uses bounded/hidden containers, line clamping, truncation, and word breaking, but exact narrow-column appearance still needs browser verification.
- A standalone API typecheck was not a passing gate in this checkout because the existing generated Prisma client (`services/api/src/generated/client`) is absent; no Prisma generation or schema change was performed.
