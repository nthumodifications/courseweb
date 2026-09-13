# v2 regression fixes

## Bug 1 — sidebar density

Reverted the spacing-only changes in `apps/web/src/components/SideNav.tsx`:

- Navigation container: `gap-4` → `gap-3`.
- Normal navigation rows: `py-2` → `py-1.5`.
- Admin Center row: `py-2` → `py-1.5`.

The `font-medium` typography and dictionary-backed Admin Center label remain.
The other chrome files were checked: `BottomNav.tsx` is already tighter than
main (`py-2` versus main's `py-2.5`), and `AppSidebar.tsx`, `Header.tsx`, and
the inspected toolbar spacing have no matching `1.5`/`3` → `2`/`4` reversal.
No other chrome values were reverted.

## Bug 2 — collapsed no-class row

In `TodaySchedule.tsx`, removed the row-wide `opacity-30` and made the left
day range explicitly `text-foreground`. The right-side `沒有課` answer remains
bold, right-aligned, and `whitespace-nowrap` at normal opacity.

## Bug 3 — settings controls

- `欄位與順序`: stacked 40px chevrons plus `py-4` made each row 112px; adjacent 40px chevrons, `py-2`, `divide-y`, and a right-side switch make each row 56px.
- `對齊`: the picker had no explicit outer size and was top-aligned; it is now a centered, fixed 128px 3×3 grid with visible cells, larger position marks, and an inset selected ring.
- `主題預設`: selection styling could change the tile border treatment; every tile now has the same base border and height, with selection shown by an inset ring and background.
- `強調色`: the lone swatch and caption looked incomplete; the swatch is now inside a labelled, clickable `選擇強調色`/`Pick accent color` control that clearly opens the native picker.
- `背景`: intrinsic chips had uneven widths/heights and could wrap; the five choices now use equal fixed-height cells in one row.
- `垂直式顯示`: the toggle was an unstructured line below the preview; it now uses the same compact label-left/control-right row anatomy as the default-view setting.
- Timetable preview: the 320px clip could cut through the 12:10 row; a bottom fade now makes the partial preview deliberate without modifying shared Timetable components.

## Verification

- `cd apps/web && bunx tsc --noEmit`: seven pre-existing errors, unchanged — six across `GenericIssueFormDialog.tsx` and `IssueFormDialog.tsx`, one in `worker.ts`; no errors in changed files.
- `cd apps/web && bun test src`: 103 passed, 0 failed.
- `bun run design-lint`: no new violations.
- Browser check: not run. This environment has no browser interface, so the requested 1440×900/390×844 light/dark visual check is not claimed.
