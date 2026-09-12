# Finish the system

Date: 2026-09-11

## Changes

- Promoted `ErrorState` to `packages/ui/src/components/ui/error-state.tsx`. It
  composes `EmptyState`, keeps `icon`, `title`, and `description`, supports the
  same `size="default" | "sm"` options, and retains the retry API.
- Promoted `SegmentedControl` to
  `packages/ui/src/components/ui/segmented-control.tsx`, including its exported
  option and props types. Both primitives are exported from the UI component
  barrel and use tokens only.
- Redirected all imports of the deleted app-local copies outside the explicitly
  excluded admin tree. The separate admin-only `ErrorState` in
  `admin/components.tsx` was left untouched because it is a different API and
  the admin tree was out of scope. The requested legacy import-path search is
  empty.
- Added live `ErrorState` and `SegmentedControl` examples to
  `apps/web/src/pages/DesignSystem.tsx`, with matching zh/en dictionary keys and
  Taiwanese-first copy. Also corrected the design-system copy that still
  described a banned `text-4xl` display size.
- Removed the non-floating card shadow, removed the redundant dark override in
  the shared alert, and changed map water labels to the semantic `info` token
  while removing their shadows and hand-written dark colours. The timetable was
  not changed.

## Design-lint

`tools/design-lint/index.mjs` now treats every non-allowlisted finding as a hard
failure; it no longer reads or writes a grandfathering baseline. The rule
sections in `tools/design-lint/baseline.json` are empty.

The exact retained exceptions are documented inline in the linter and are:

- `folder-colors.ts:bg-neutral-500`: user-selectable course-folder data colour.
- `WeatherIcon.tsx:text-gray-400` and `text-gray-300`: weather-icon data palette.
- `admin/announcements/page.tsx:dark:border-destructive`: one admin-owned line
  retained only because the task forbids editing `apps/web/src/app/[lang]/admin`.
- Six genuine floating shadows: the admin chart tooltip, calendar replication
  status toast, time-picker dropdown, hover card, select dropdown, and tooltip.

No rule in `LANGUAGE.md` proved impractical. The admin no-touch boundary is the
only reason one legacy dark override remains, and it is explicitly surfaced
instead of being hidden by a file-count baseline. `EmptyState` currently has
`default` and `sm`; if an `inline` size is added elsewhere, `ErrorState` should
be kept in step.

## Verification

- Initial `apps/web` TypeScript: 8 pre-existing diagnostics.
- Final `apps/web` TypeScript: the same 8 diagnostics, with none added.
- `bun run design-lint`: passed; all four rules report `0` unallowlisted hits.
- `bun test src`: 103 passed, 0 failed.
- `packages/ui` TypeScript: passed.
- zh/en dictionary key trees: identical.
- `git diff --check`: passed.
- No browser executable is available in this environment, so the 1440×900 and
  390×844 light/dark visual pass could not be performed interactively. The
  added design-system grid collapses at `md`, and no timetable/layout code was
  moved.

No additional local component needs promotion: both previously misplaced design
system components are now in `@courseweb/ui`.
