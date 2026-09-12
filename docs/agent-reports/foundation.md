# NTHUMods design-system foundation

Date: 2026-09-11  
Branch: `feat/design-language`

## Tokens

Added the six CSS variables to both theme blocks in `apps/web/src/app/globals.css`:

| token     | light         | dark          | foreground  |
| --------- | ------------- | ------------- | ----------- |
| `success` | `142 72% 29%` | `142 55% 32%` | `0 0% 100%` |
| `warning` | `32 95% 30%`  | `32 90% 35%`  | `0 0% 100%` |
| `info`    | `215 85% 38%` | `215 80% 48%` | `0 0% 100%` |

The colors stay in the same restrained, saturated range as the existing purple
primary and neutral palette. Calculated contrast against the white foreground is
approximately 5.07:1 / 5.03:1 for success, 6.05:1 / 4.85:1 for warning, and
7.20:1 / 5.07:1 for info (light / dark), so every pairing clears WCAG AA for
normal text.

`packages/tailwind-config/base.js` now exposes each token with the same shape as
`destructive`, including `bg-*`, `text-*-foreground`, and `border-*` utilities.

The settings presets do not get their palette from `globals.css`; they define it
in `apps/web/src/config/themePresets.ts`, and `applyThemeConfig` copies those
values to CSS variables. There are fifteen presets. I added a shared semantic
status map while constructing the exported `THEME_PRESETS`, so all fifteen light
and dark preset outputs provide sensible values for success, warning, and info
instead of retaining global defaults.

## UI primitives

All five primitives live under `packages/ui/src/components/ui/` and are exported
through `packages/ui/src/components/index.ts` and therefore the package index.
They use semantic utilities only and contain no `dark:` overrides.

- `PageShell`: `width="content" | "app" | "full"`, optional `gap` and
  `className`. It owns `px-4 md:px-6 lg:px-8`, `pt-4`, mobile bottom-nav and
  safe-area clearance, centered max widths (`max-w-3xl`, `max-w-6xl`, or none),
  and default `space-y-6` child rhythm. Shell classes are composed after
  `className`, so page additions cannot replace the gutters.
- `PageHeader`: `title`, optional `description`, optional `actions`, and normal
  header attributes. It renders the one-line `text-xl font-semibold` title/action
  row and a truncated `text-sm text-muted-foreground` description row.
- `EmptyState`: `icon`, `title`, `description`, optional `action`, and
  `size="default" | "sm"`. The default is the centered signed-out pattern; `sm`
  is the tighter inline card/list form.
- `Section`: `title`, optional `description` and `actions`, plus
  `variant="plain" | "card"`. The card variant is the specified
  `bg-card border border-border rounded-lg p-4` surface with no shadow, and its
  body applies `space-y-3`.
- `PageSkeleton`: `rows` (default 3) and normal div attributes. It renders a
  header-shaped pair of `Skeleton` blocks followed by the requested number of
  row blocks. The existing `Skeleton` already uses `bg-muted`; it does not use a
  `bg-gray-*` utility.

## Main layout and reference migrations

`apps/web/src/layouts/MainLayout.tsx` now leaves the content wrapper unpadded.
The existing error boundary and Suspense fallback are unchanged; page shells are
now the owner of route spacing.

- Grades uses `PageShell width="app"`, `PageHeader` with the localized 成績 /
  Grades title, and an `EmptyState` with a title, explanatory description, and a
  button linking to the localized `/proxy-login` route.
- Sports venues uses `PageShell width="app"`. Its `PageHeader` puts the refresh
  control (and update time) in `actions` and moves the localized `資料來源：…`
  line into `description`. It shows an `EmptyState` after both data requests
  finish with no facilities. Occupancy bars and status text also demonstrate the
  new semantic status tokens.
- Shops uses `PageShell width="app"` and `PageHeader` for the loaded and error
  states. Loading now uses `PageSkeleton rows={5}`. The former `p-8` outer wrapper
  was removed from `ShopList` so the shell owns the page gutters.

All added or changed user-facing copy is present in both `zh.json` and `en.json`;
their key trees were checked and contain 1,452 nested keys each.

## Design lint

Added `tools/design-lint/index.mjs`, `tools/design-lint/baseline.json`, and the
root `design-lint` script. It scans the requested web and UI source trees for
hardcoded gray-family utilities, color-naming `dark:` utilities, oversized app
page text, and non-overlay `shadow-sm` / `shadow-md`.

Current checked-in baseline and every-run summary:

| rule                | remaining occurrences | files |
| ------------------- | --------------------: | ----: |
| hardcoded color     |                   355 |    50 |
| dark color override |                   230 |    44 |
| large app-page type |                    11 |     5 |
| non-overlay shadow  |                    39 |    25 |

The baseline stores per-file occurrence counts. A file not listed, or an increase
above its stored count, fails the check. When a file is cleaned, its entry can be
moved from `files` to that rule's `cleaned` list; any later reintroduction then
fails as a regression. `bun run design-lint` currently passes and prints the
summary above.

The audit's approximate 223 / 196 figures are an earlier snapshot with a
different counting scope. The baseline numbers above are the reproducible counts
from this checker over the current checkout and all four requested palette names.

## Design-system page

`apps/web/src/pages/DesignSystem.tsx` was rewritten around the new system. It now
opens with the NTHUMods philosophy and five principles, keeps the existing
section-scroll navigation, documents composition rules before the gallery, and
shows live PageShell width examples, PageHeader, EmptyState, Section, and
PageSkeleton examples. It documents only the actual globals-based semantic
tokens, including success, warning, info, and the existing `--font-family` /
`--font-scale` entry points. Its own layout uses PageShell, PageHeader, Section,
and the new state primitives.

## Verification and caveats

The required initial and final `cd apps/web && bunx tsc --noEmit` runs both had
the same eight existing diagnostics: the shops `unknown` data type, three
`unknown` accesses in `GenericIssueFormDialog`, three in `IssueFormDialog`, and
the worker `CacheStorage.default` diagnostic. No new TypeScript diagnostics were
introduced. `git diff --check` also passed.

Nothing in `LANGUAGE.md` was technically impossible to implement. The one scope
caveat is intentional: its “every route has exactly one PageShell” rule cannot be
true during this foundation-only change because the task explicitly limits page
migrations to the three reference routes (plus `/design-system`); the remaining
routes are left for the migration agents. No `docs/design/` file was changed.
