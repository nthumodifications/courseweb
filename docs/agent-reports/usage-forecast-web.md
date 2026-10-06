# Busy-time forecast + anomaly UI (web)

## Files added or changed

Added:

- `apps/web/src/lib/usage-forecast.ts` — API-contract type copy, plain `fetch` wrapper, five-minute React Query polling hook, id join, vacancy-to-busyness conversion, window formatting, learning/empty state, anomaly mapping, and library-series filtering helpers.
- `apps/web/src/lib/usage-forecast.test.ts` — fixtures and unit tests for occupancy, vacancy, learning, empty, all anomaly types, id joins, conversion, windows, and library filtering.
- `apps/web/src/components/Venue/UsageForecast.tsx` — shared compact SVG forecast component with normal band, expected/actual/next lines, now marker, guidance, anomalies, quality note, and learning state.

Changed:

- `apps/web/src/app/[lang]/(mods-pages)/sports-venues/page.tsx` — optional `gym` forecast query and series join by `project_id`; live occupancy, progress, and opening-hours UI remain unchanged.
- `apps/web/src/app/[lang]/(mods-pages)/library/page.tsx` — optional `library` forecast query; only rows with the page's existing estimated capacity of at least 10 are shown a forecast, joined by `zoneid`.
- `apps/web/src/dictionaries/en.json`
- `apps/web/src/dictionaries/zh.json`

The concurrent API-agent changes under `services/api/` were not edited.

## Dictionary keys added

Both dictionaries have the same new `usage_forecast` tree:

`learning`, `usually_busiest`, `quietest`, `trend_rising`, `trend_falling`, `trend_steady`, `anomaly_busier`, `anomaly_quieter`, `anomaly_unexpected_closed`, `anomaly_stale`, `accuracy`, `people_unit`, and `space_unit`.

## Checks

Focused forecast tests:

```text
bun test src/lib/usage-forecast.test.ts
6 pass
0 fail
18 expect() calls
Ran 6 tests across 1 file.
```

Existing library tests:

```text
bun test src/lib/library.test.ts
6 pass
0 fail
34 expect() calls
Ran 6 tests across 1 file.
```

Typecheck:

```text
bunx tsc --noEmit -p .
```

Reports exactly the same 9 pre-existing errors as the baseline: three each in `GenericIssueFormDialog.tsx` and `IssueFormDialog.tsx`, plus `features/dining/useDining.ts`, `lib/local-search/flexsearch-index.ts`, and `worker.ts`. No changed web file appears in the errors.

Dictionary key-tree script:

```text
{"en":1833,"zh":1833,"onlyEn":[],"onlyZh":[]}
```

The new files and library integration pass Prettier. `git diff --check -- apps/web` has no whitespace errors.

`bun run build` transforms the app but fails in the existing local-search path because Rollup cannot resolve the pre-existing `flexsearch` import in `src/lib/local-search/flexsearch-index.ts`.

## Running-app verification

Vite started successfully with `bun run dev -- --host 127.0.0.1`. Requests to both routes returned the SPA shell with HTTP 200:

- `/en/sports-venues` — 200
- `/en/library` — 200

The dev server logged only existing Browserslist and Tailwind deprecation warnings. No browser automation package is installed in this worktree, so I could not visually inspect rendered DOM, responsive width, or light/dark themes. The forecast API route is also not available in this worktree, so actual ready/learning/anomaly data was not checked in a running browser; the optional-query failure path was implemented by rendering nothing when the query has no data.

## Contract notes and uncertainties

- Library vacancy needs direction correction for charts. The component uses the page's existing capacity estimate as an override and plots `capacity - free vacancy`; normal-band low/high edges are reversed during this conversion. Unknown-capacity vacancy series are not plotted as busyness.
- `quality.skill` is intentionally not displayed. The UI shows only rounded MAE as an accuracy note.
- The API's `name` is not used for row labels; rows continue using each page's existing localized naming and join by the contract's stable id.
- No remaining implementation uncertainty was found in the web contract copy. Visual browser/theme validation and real API response integration remain for the manager's integrated environment.

## Second pass

### What changed and why

- Replaced the always-open SVG line chart with a compact, direction-correct row forecast. Each ready row now has a verdict chip, one selected action sentence, and a small HTML popular-times strip. The strip aggregates half-hour typical values into hours, highlights the current hour, and overlays the live value so the student can answer “should I go now?” quickly. No `preserveAspectRatio="none"`, SVG text, or `ml-11` alignment hack remains.
- Added an explicit detail affordance. Library rows disclose one inline detail panel; sports rows use the existing facility sheet and put the detail forecast above the opening-hours controls. Detail has optional seven-day tabs, hourly typical/observed/predicted bars, a now marker only for today, a legend, reference peak value, derived peak/quiet windows, and the accuracy note.
- Added pure helpers for the verdict/band comparison, vacancy direction, one-sentence guidance, hourly aggregation, hours-in-use trimming, weekday windows, and page-level learning notice. Learning series do not render row forecast UI; a non-empty all-learning response produces one page notice.
- Added optional `UsageSeries.week` to the web contract copy. With no `week` field, detail remains today-only. Library forecasts still require capacity at least 10, and failed/empty forecast responses add no page or row UI.

### Dictionary changes

Added in both `en.json` and `zh.json`: `verdict_quieter`, `verdict_usual`, `verdict_busier`, `verdict_unexpected_closed`, `verdict_stale`, `sentence_quieter_after`, `sentence_gets_busy_around`, `sentence_usually_busiest`, `sentence_usually_quietest`, `details`, `day_picker`, `typical`, `observed`, `predicted`, `now`, `chart_summary`, `peak_reference`, `busiest_label`, `quietest_label`, and `no_pattern`. The page-level `learning` copy was updated.

Removed because the second pass no longer concatenates row guidance or renders a separate anomaly badge: `usually_busiest`, `quietest`, `trend_rising`, `trend_falling`, `trend_steady`, `anomaly_busier`, `anomaly_quieter`, `anomaly_unexpected_closed`, and `anomaly_stale`. `accuracy`, `people_unit`, and `space_unit` remain for the detail surface.

### Checks

Focused tests, including both requested files and all new pure helpers:

```text
bun test src/lib/usage-forecast.test.ts src/lib/library.test.ts
17 pass
0 fail
71 expect() calls
Ran 17 tests across 2 files.
```

Typecheck still reports exactly the nine baseline errors and no changed-file error:

```text
src/components/Forms/GenericIssueFormDialog.tsx(37,22): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/GenericIssueFormDialog.tsx(37,41): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/GenericIssueFormDialog.tsx(38,19): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(35,22): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(35,41): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(36,19): error TS18046: 'errorData' is of type 'unknown'.
src/features/dining/useDining.ts(20,37): error TS2339: Property 'dining' does not exist on the generated client type.
src/lib/local-search/flexsearch-index.ts(1,24): error TS2307: Cannot find module 'flexsearch' or its corresponding type declarations.
worker.ts(842,26): error TS2339: Property 'default' does not exist on type 'CacheStorage'.
```

Prettier check passed for all changed web files, and `git diff --check -- apps/web` reported no whitespace errors. A throwaway dictionary key-tree check returned:

```text
{"en":1644,"zh":1644,"onlyEn":[],"onlyZh":[]}
```

The changed application code contains no mock data or mock switch. The API agent's files under `services/api/` were not edited.

### Verification gaps and uncertainties

There is no real usage API response in this worktree, so I could not verify ready/learning/week/anomaly rendering against live data. I did not add fixture wiring or a mock switch. No browser automation package is available here, so I could not visually verify 360px layout, dark mode, or the sports sheet in a running browser; the responsive and theme behavior is based on the existing Tailwind semantic tokens and source inspection. The optional `week` day picker and client-derived non-today windows therefore remain unverified against the API agent's eventual payload shape beyond the documented contract.

## Third pass

### What changed per item

1. The web contract now requires `UsageSeries.week` (including `[]` during learning). Today slots with `level: null` are converted to null before hourly aggregation, so closed leading/trailing hours are trimmed and closed interior hours remain empty rather than becoming slivers. Weekday `week` values remain null-aware, and 24-hour data retains all 24 bars.
2. Forecast bars are neutral: typical strip bars use `bg-primary/25`, the current hour uses `bg-primary`, and the live value is a short foreground cap. The detail chart uses `bg-primary/20` typical bars, centered 55%-width solid observed bars, and centered dashed outlined predicted bars. The old per-level bar color helpers were removed; verdict chips retain semantic colors.
3. Detail observed/predicted layers are freshness- and time-gated, negative values are clamped before rendering, the legend matches the drawn classes, and the Now tick/label is on the axis under the chart.
4. Sports forecast rows with a facility sheet no longer render a second disclosure button; the whole facility row, including its forecast, opens the sheet. Inline disclosure remains for library rows and sports rows without a facility.
5. Verdict labels were shortened in both dictionaries. The chip is non-wrapping/non-shrinking; the sentence is one-line ellipsis text with a title containing the full sentence.
6. `pickUsageSentence` now uses current time versus peak windows, with a closest-to-60-minutes forecast sentence for busier/quieter verdicts. Vacancy forecast sentences use raw free-seat values; stale and unexpected-closed verdicts use the window rules.
7. Both pages pass their own live raw count and the response `generatedAt`. Verdicts require a snapshot younger than 45 minutes, while old snapshots keep typical bars and rule-based copy but hide observed/predicted layers and never mute the live page number. A server anomaly still wins when the snapshot is fresh, and closed current slots suppress non-anomaly verdicts.
8. Weekday tabs now use roving `tabIndex`, Left/Right/Home/End navigation, `aria-controls`, and a labelled `role="tabpanel"`. Today's tab has an accessible Today marker without forcing initial focus.
9. Vacancy peak copy now says seats in use; vacancy accuracy uses seats, while forecast guidance says free seats. Gym copy remains in people.

### Dictionary changes

Added in both dictionaries: `sentence_busy_until`, `sentence_forecast`, `today`, `peak_reference_people`, `peak_reference_vacancy`, and `free_seats_unit`.

Removed in both dictionaries because the third-pass UI no longer reads them: `sentence_quieter_after`, `sentence_usually_busiest`, and the generic `peak_reference`. Updated verdict labels, quiet-window copy, and `space_unit`. The English and Chinese `usage_forecast` key trees remain identical.

```text
{"en":1847,"zh":1847,"onlyEn":[],"onlyZh":[]}
```

### Checks

Focused tests:

```text
bun test src/lib/usage-forecast.test.ts src/lib/library.test.ts
19 pass
0 fail
83 expect() calls
Ran 19 tests across 2 files.
```

The focused suite covers closed-slot trimming from `level: null`, 24-hour retention, live-value verdicts including vacancy direction, closed-slot verdict suppression, all four sentence rules, occupancy/vacancy forecast units, freshness, and negative clamping.

Typecheck:

```text
bunx tsc --noEmit -p .
```

The output contains exactly the nine pre-existing errors: three in `GenericIssueFormDialog.tsx`, three in `IssueFormDialog.tsx`, and one each in `features/dining/useDining.ts`, `lib/local-search/flexsearch-index.ts`, and `worker.ts`. No changed web file appears in the errors.

`git diff --check -- apps/web docs/agent-reports/usage-forecast-web.md` reported no whitespace errors. Prettier completed for all changed web source, test, page, and dictionary files. No mock data or mock switch was added to application code. I did not edit any `services/` or `packages/` file; pre-existing API-agent changes remain in the worktree.

### Gaps

No browser automation or real API response was available in this worktree, so I could not visually re-render the manager's 360px light/dark screenshots, verify the actual sports sheet interaction, or validate the final API payload in a running browser. I did not run a build or deployment check, and I did not commit, push, deploy, or run `gh`.
