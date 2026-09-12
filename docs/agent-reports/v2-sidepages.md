# v2 side pages and app list

Scope: `side-pages/**`, `apps/**`, and `community/**`. The bus page, Timetable components, UI package, and settings were not changed.

## Page-by-page changes

### `changelog`

- Before: A centred, max-width page with a large hero, descriptive subtitle, pastel type colours, card-wrapped releases, and oversized headings.
- Changed: Removed the page header and reading column, changed releases to compact `divide-y divide-border` rows, removed card/shadow/pastel styling, and reduced type to the base scale.
- Rule: §1/§2 remove centred page headers; §4 lists use one dividing line; §5 surfaces do not float; §6 colour uses tokens; §7 removes oversized and semibold type.

### `contribute`

- Before: Centred hero, pastel statistic tiles, sponsor cards, coloured social tiles, large spacing, shadows, and large headings.
- Changed: Removed the hero, converted sponsors, statistics, feedback, and developer actions to token-based divided rows, moved statistic values and sponsor names into both dictionaries, and removed decorative brand colours and shadows.
- Rule: §2 removes explanatory page headers; §3 limits spacing; §4 replaces card grids with divided lists; §5 removes non-floating shadows; §6 reserves colour for semantic tokens; §7/§8 use compact bold hierarchy and bilingual copy.

### `issues` and `EmptyIssueForm`

- Before: English-only heading and explainer, a centred/max-width form, large data-source labels, and hardcoded English validation/form strings.
- Changed: Made the data-source explanation and form fully dictionary-driven in Traditional Chinese and English, aligned the sources as divided rows, removed the reading-width wrapper, and changed feedback colours to semantic tokens.
- Rule: §1 left-aligns the page; §4 uses `divide-y divide-border`; §6 uses semantic colour tokens; §8 requires every user-facing string in both dictionaries.

### `next-steps`

- Before: Duplicated hardcoded Chinese/English documents with a `text-5xl` hero, `py-8`, max-width prose column, and dark prose override.
- Changed: Rendered the existing document content from paired dictionary sections, kept the long-form title at `text-xl`, removed the description-style hero treatment, and added relaxed body line height.
- Rule: §1 removes the centred reading column; §2 keeps only the genuinely required document title; §3 reduces spacing; §8 uses dictionary copy and `leading-relaxed` for Chinese body text.

### `privacy-policy`

- Before: Separate hardcoded language trees with max-width prose, `text-5xl` hero headings, large vertical spacing, and `dark:prose-invert`.
- Changed: Kept the policy sections and copy, moved both translations into structured dictionaries, rendered sections/lists from those dictionaries, reduced headings and spacing, and removed the dark override.
- Rule: §1/§2 remove the reading-column hero; §3 reduces spacing; §7 caps document headings at `text-xl`; §8 requires paired dictionary copy and relaxed body line height.

### `proxy-login`

- Before: Separate hardcoded language trees with `text-5xl` heroes, large prose spacing, a decorative purple notice panel, italic text, and hardcoded Mermaid labels.
- Changed: Kept the same explanation sections, links, and diagrams while moving all visible copy and diagram labels into both dictionaries; reduced type/spacing, removed the decorative panel treatment, and removed italic/dark prose styling.
- Rule: §1/§2 remove the centred hero; §3 reduces spacing; §5 keeps surfaces flat; §6 removes decorative brand fills; §8 removes italic mixed-script treatment and localizes all visible strings.

### `recruit`

- Before: Large centred recruitment hero with subtitle/description, max-width article, oversized headings, semibold roles, grid cards, and excessive responsive spacing.
- Changed: Kept the recruitment flow and form, removed the subtitle/description header copy, made roles a divided list, reduced heading/card/form spacing, and left only complete application states as cards.
- Rule: §2 removes explanatory descriptions; §3 reduces spacing; §4 treats roles as a list; §7 uses compact bold hierarchy and removes `font-semibold`.

### `team`

- Before: English-only page copy, prose dark override, `text-xl` member names, a floating emoji/role badge with shadow, and grid/flex layouts without list rhythm.
- Changed: Added bilingual dictionary copy, dropped the unaligned emoji badge, and rendered core/dedicated members as compact divided rows with base-size names and token surfaces.
- Rule: §4 uses divided lists; §5 removes the floating shadow because the member rows do not float; §7 reduces type; §8 requires bilingual dictionary copy and no decorative emoji.

### `apps`, `AppItem`, and `Favorite`

- Before: App categories and pinned apps were card grids, the BETA marker covered the icon with blue/white/8px/semibold styling, app labels had a centred mini layout, and favourites used hardcoded yellow/gray/dark colours.
- Changed: Made the app directory and pinned-apps dialog divided lists, moved BETA beside the app name through the existing tokenized `Badge` primitive in both render paths, localized app/category labels, and replaced favourite colours with primary/muted tokens.
- Rule: §4 uses divided lists; §6 removes hardcoded colours and reserves primary for the action/state; §7/§8 remove semibold/centred mixed-script treatment.

### `community`

- Before: English-only page title, description, filters, empty state, pagination, and timetable details; timetable cards used borders, rounded corners, shadow, grid layout, and an amber colour.
- Changed: Localized all visible UI strings, changed timetable cards to divided rows, removed card/shadow/amber decoration and the centred empty state, and retained the timetable detail dialog as the genuinely floating surface.
- Rule: §2 removes the redundant description; §4 replaces the card grid with a divided list; §5 limits shadows to the dialog; §6 uses tokens; §8 requires dictionary copy.

### `web-for-beginners`

- No matching route or file exists under `apps/web/src/app/[lang]/(mods-pages)` in this checkout, so no page was invented or modified. The existing proxy-login links retain their original destinations.

## Changes that cross page boundaries

- Added paired dictionary entries for issues, team, community, long-form documents, app/category labels, BETA, statistics, and sponsor names. This is required by LANGUAGE.md §8 and keeps JSX free of user-facing hardcoded copy.
- The only shared app primitive change is in the assigned `AppItem.tsx`; `packages/ui` was not touched.

## Verification

- `cd apps/web && bun test src`: **103 passed, 0 failed**.
- `cd apps/web && bunx tsc --noEmit`: **exactly the 8 stated pre-existing errors** remain (shops, the two issue form dialogs, and worker); no errors point to this change.
- `bunx prettier --check` on all changed TSX/JSON files: **passed**.
- Requested `bun run design-lint`: unavailable because this checkout has no `design-lint` package script. Direct `bun tools/design-lint/index.mjs` still reports existing repository-wide violations, but no violation under `side-pages`, `apps`, or `community`.
- Requested side-page grep for `text-4xl`, `text-3xl`, `text-2xl`, `font-semibold`, `mx-auto`, and `text-center`: **empty**.
- No browser is available in this session, so the 1440×900/390×844 light/dark visual check was not performed.
