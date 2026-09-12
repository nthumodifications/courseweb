# Empty-state density report

## Changes

- Added `inline` to `@courseweb/ui` `EmptyState`. It has no vertical padding, a 16px muted icon beside a `text-sm font-medium` title, and an optional `text-xs` description. The existing `default` and `sm` branches retain their previous structure and classes.
- Audited the 30 non-admin `<EmptyState>` call sites in `apps/web/src` and made every size explicit. Page-level results and panes use `default`; sections, cards, widgets, and compact timetable content use `sm`; the venue list rail, calendar rail, and collapsed calendar ranges use `inline`.
- `UpcomingEventList` now requires an `emptyStateSize` prop. Its calendar-rail consumer passes `inline`; today, mobile-calendar, and other card consumers pass `sm`, so the shared component no longer fixes one density for every context.
- The app-local `ErrorState` now accepts and forwards `EmptyStateSize`. The community detail dialog uses `sm`, and the venues list rail uses `inline`; page-level errors continue to use explicit `default` through the wrapper.
- `/zh/apps` BETA badges now sit beside their icons in normal flow instead of being absolutely offset over them.
- `/zh/team` no longer renders the unanchored emoji under core-member avatars.
- `/zh/timetable` keeps `社群` in the share/export control row instead of pushing it to the far edge; it now also has the row's compact touch target and focus treatment.

No user-facing copy changed, so the dictionary key trees remain untouched and identical.

## Language review

No rule in `LANGUAGE.md` was impractical for this change. The `inline` variant directly applies P1/P5 density and P3 shared-composition rules without moving page layouts. The timetable grid was not changed.

One instruction boundary remains: the task both prohibits edits under `apps/web/src/app/[lang]/admin/` and asks for every `<EmptyState>` hit under `apps/web/src` to carry a size. The 30 non-admin hits are explicit; 11 existing admin hits remain unchanged because the file-scope prohibition takes precedence.

## Verification

- Initial `cd apps/web && bunx tsc --noEmit`: 8 pre-existing errors.
- Final `cd apps/web && bunx tsc --noEmit`: the same 8 errors, with no additions.
- `bun run design-lint`: passed; no new violations.
- `git diff --check`: passed.
- The non-admin `<EmptyState>` inventory found no opening without an explicit `size`.
- No browser was available for the requested 1440×900 / 390×844 light/dark visual check, so no visual pass is claimed.

## Promotion candidate

No new component was created. The existing app-local `ErrorState` remains a candidate for eventual promotion into `@courseweb/ui` alongside the shared `EmptyState`; this task only added its density pass-through.
