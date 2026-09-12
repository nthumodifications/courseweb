# Utility pages design-language migration

Date: 2026-09-11  
Branch: `design/utility-pages`

## Changes by audit item

### CM1–CM4 — community timetables

- Replaced the bespoke community header/container with `PageShell width="app"`
  and `PageHeader`.
- Routed the page title, description, semester filter, live/snapshot labels,
  course counts, notes, grade metadata, pagination, and empty/error copy through
  both dictionaries. The community route handle in `router.tsx` is localized as
  well.
- Added `PageSkeleton` for the gallery and the course-detail dialog, and added a
  retryable `ErrorState` for both requests. The existing timetable/card and
  detail-grid arrangements remain intact.
- Added focus-visible treatment to the card and semester controls.

### A1–A5 — app list

- Removed the duplicate sponsor cards from the app grid; the app-shell/sidebar
  sponsor placement remains untouched.
- Made the category grid stretch items to equal-height cards while retaining the
  existing categories and order.
- Put every app icon, including the Chumei raster logo, in the same token-based
  bordered/radius container.
- Positioned `BETA` as an absolutely positioned annotation on the icon box so it
  no longer collides with the icon.
- Replaced the centered pinned-apps placeholder with `EmptyState` and a dialog
  trigger action that opens the pin-apps control. App titles and category titles
  now come from the dictionaries.

### V1 — venues

- Added the localized `PageHeader`.
- Added list loading, list failure/retry, and empty states using the foundation
  primitives and the shared error state.
- Replaced the right-pane placeholder with a proper `EmptyState`, and added
  loading/error handling for venue timetable data and its lazy-loaded content.
- Kept the two-pane layout and its responsive behavior; removed page-local gutter
  padding from the list/detail content.

### B2 and X1 — data failure states

- Added [`ErrorState`](../../apps/web/src/components/Pages/ErrorState.tsx), an
  app-local icon, plain-language description, and retry-button composition built
  on `EmptyState`.
- Added skeleton/content/error-with-retry coverage to the bus index, bus route,
  and bus line views. The bus index loading state is shaped like route rows.
- Wired the failure branch only in `shops` and `sports-venues`, as requested:
  shops now retries its dining request; sports venues retries both occupancy and
  opening-time requests. Their existing success and loading paths were not
  otherwise migrated here.
- Added localized bus route labels and metadata where the touched route UI had
  previously embedded English/Chinese copy.

### M2–M3 — map chrome

- Left the 3D scene palette and scene rendering unchanged.
- Changed the map search card and information panel to the system radius/border
  treatment; retained shadow only for floating surfaces.
- Grouped the legend/reset controls into one matching floating cluster.
- Made the map frame symmetric with a single inset panel.
- Moved the map attribution to the lower-left so the global chat FAB cannot cover
  the licence text.
- Added localized map loading and retryable data-error states around the scene.

### Student pages and group

- Wrapped `student/id`, `student/parcel`, and `student/planner` in the foundation
  shells and headers.
- Added auth-loading skeletons and the shared signed-out `EmptyState` + sign-in
  action pattern. Planner runtime failures now use the retryable error state.
- The group timetable page now has a localized shell/header, loading/error/not
  found states, localized actions and member controls, and a compact empty state
  when no member is selected. The timetable grid arrangement is unchanged.

## Rules and caveats

No rule in `LANGUAGE.md` proved technically impractical. The map's existing
muted campus palette was intentionally left alone because the task explicitly
made the scene the visual reference and limited this migration to its chrome.
The fixed bus station lists were moved into the mirrored dictionaries as part of
the localization pass; timing and API route identifiers remain in the data model.

The signed-in ID and parcel pages still show a localized unavailable state: the
actual OSA/parcel implementations were already commented out in the source, so
this pass did not invent a backend integration or pretend those features were
available. The planner's nested legacy editing components retain their existing
design-lint baseline violations; this pass changed the page shell and state
boundary rather than restyling those internal controls.

Manual browser checks at 1440×900 and 390×844 in both themes were not executable
in this environment because no browser/visual runner is available. The source
review covers shell gutters, bottom-nav clearance, focus rings, and overflow
constraints; a browser pass should still be done by the manager before merge.

## Shared component promotion candidate

Promote `ErrorState` into `@courseweb/ui` after the other migration agents have
validated the copy and icon/action API. It is deliberately app-local in this
pass because the primitives package was out of scope.

## Verification

- `cd apps/web && bunx tsc --noEmit`: the final run has the same eight
  pre-existing diagnostics captured before editing (shops `unknown` data type,
  three `GenericIssueFormDialog` unknown accesses, three `IssueFormDialog`
  unknown accesses, and `worker.ts` `CacheStorage.default`). No new diagnostics
  were added.
- `bun run design-lint`: passed; no new violations.
- `cd apps/web && bun run build`: passed. Existing Browserslist/Tailwind,
  pdfjs eval, and large-chunk warnings remain warnings only.
- `cd apps/web && bun run test`: passed, 103 tests / 0 failures.
- `git diff --check`: passed.
- `zh.json` and `en.json`: key-tree parity check passed with no missing keys in
  either direction.

No commit, push, or unrelated file cleanup was performed.
