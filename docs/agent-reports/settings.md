# Settings agent report

## Scope

Implemented the settings-language pass for ST1, ST2, ST3, the shared header and bottom navigation, and the announcement alerts. The timetable grid layout itself was left untouched.

## Audit items

### ST1 — one segmented-control treatment

- Added a local `SegmentedControl` in `apps/web/src/components/SegmentedControl.tsx`.
- Reused it for the NTHUMods preset, secondary developer themes, fonts, radius, density, backgrounds, and widget columns.
- Theme, font, radius, and background visual samples stay inside the same option shape as their labels. Grid mode is only a responsive layout of the same control treatment.
- Added visible token focus rings and radio semantics to the choice buttons.

### ST2 — one navigation list

- Replaced the duplicated bottom/sidebar settings lists with `NavigationSection`.
- Each item has one placement choice: hidden, bottom, side, or both, plus a shared drag order.
- The editor reads and writes the existing `bottom_nav_items` and `sidebar_nav_items` keys, preserving the current shell consumers and existing student preferences.
- `設定` remains absent from the default bottom-nav display, but is available as a disabled-by-default item so it can be enabled from the unified list.
- The old section files remain as compatibility re-exports because `BottomNav` and `SideNav` still import their defaults and types.

### ST3 — one NTHUMods opinion

- Kept all 15 presets and made `NTHUMods` its own clearly identified default section; the 14 developer-flavoured presets are under `其他主題` / `Other themes`.
- Converted the settings page to `PageShell`, `PageHeader`, and `Section`, and made all setting controls use the label/description/control row pattern.
- Added descriptions to previously bare settings, including display, timetable, AI, widget, custom CSS, and navigation controls.
- The source preset objects were missing `card`, `card-foreground`, `popover`, and `popover-foreground` in both modes for all 15 presets. The six success/warning/info values per mode were also centralized in the foundation status map rather than present in each source object.
- Added `completeColorMode` so the exported `THEME_PRESETS` has all 33 `ThemeCSSVar` values in both light and dark modes, including success/warning/info. `ThemePresetColors` now reflects that complete runtime contract. A runtime inventory checked all 15 presets and found no missing values.

## Shared shell and alerts

- Header height is now box-sized and fixed by the existing header token. The portal region can shrink and clips overflow, so routes with and without portal content do not change the shell height. The page name remains exclusively in `PageHeader`; no header control was added.
- Bottom navigation keeps its existing storage and route behavior, while using token surfaces, minimum touch targets, keyboard focus rings, semantic current-page state, and a localized nav label.
- `AnnouncementBar` now uses `info`, `warning`, and `destructive` tokens. `ThemeChangableAlert` uses the info tokens too, with localized dismiss labels and keyboard-visible links/buttons.

## Rules and omissions

- No `LANGUAGE.md` rule proved wrong or impractical. The four settings choices use one component; the grid presentation is a responsive arrangement inside that component, not a second interaction style.
- No browser or Playwright/Chromium harness is installed in this worktree, so the requested live 1440×900 and 390×844 light/dark visual pass could not be performed. Static review covered responsive stacking, token-only owned UI classes, focus rings, bottom-nav clearance via `PageShell`, and horizontal overflow risks. The timetable grid was intentionally not changed.
- `SideNav.tsx` itself was not changed because it is outside this task's owned files. The unified editor continues to synchronize its existing storage key.

## Promotion candidate

Promote `SegmentedControl` to `@courseweb/ui` once its API is settled. It provides the shared tokenized surface, radio semantics, focus treatment, and optional responsive grid layout needed by this page.

## Verification

- `cd apps/web && bunx tsc --noEmit`: exactly the 8 pre-existing diagnostics captured before the work; no settings or shell diagnostics were added.
- `bun run design-lint`: passed with no new violations (`hardcoded-color 353`, `dark-color 229`, `large-type 11`, `overlay-shadow 38`).
- Dictionary key-tree comparison: `zh.json` and `en.json` both contain 1554 keys; differences `0`.
- Theme inventory: 15 presets, 15 map entries, 33 tokens, no missing values.
- `git diff --check`: passed.
- Full `bun run build:web` reached successful UI/shared builds but stopped in pre-existing `packages/api-types/src/client.ts` TS2742 portability errors before the web package build.
