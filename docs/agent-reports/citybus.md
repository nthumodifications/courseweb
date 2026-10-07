# City bus line detail report

## Findings

- The campus shuttle detail rendered its header and timeline directly in `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/[line]/page.tsx`; the timeline used the rail, dot, bus marker, `py-4` row padding, and `px-4`/`p-2` gutters now preserved in `apps/web/src/features/bus/BusLineDetailShared.tsx:38` and `:118`.
- The old city detail was a bordered/select-based screen in `CityBusDetails.tsx`; its separate full-day timetable used `dict.bus.full_day_timetable` at the old detail implementation. The checked-in route data is available at `/fallback_data/citybus/routes/83.json` and the double-encoded `/fallback_data/citybus/routes/%25E5%2585%2588%25E5%25B0%258E%25E5%2585%25AC%25E8%25BB%258A.json`.
- Route 83 and 先導公車 both contain timetable schedules with per-stop times. The new trip logic is in `apps/web/src/libs/citybus.ts:326`, with next-trip selection at `:407` and previous/next stepping at `:413`.

## Design decisions

- Extracted the shuttle header and stop timeline without changing their rendered classes or markup. The original committed route module and the restored module produced identical 390x844 screenshots: `0` differing pixels.
- City detail uses the same shared header/timeline, with `CityBusLineBadge`, the existing bus-page Tabs components for direction selection, a compact previous/next trip control, and a clickable/actionable stop row for changing the boarding stop.
- Timetable trips are selected from real per-stop route data. Cross-midnight values such as `25:10` normalize to `01:10` on the following service day. Frequency schedules render one headway window and leave stop times empty rather than inventing arrivals.
- Realtime city departures were not merged into the detail timeline because the available departure response does not identify the complete per-stop trip needed by this screen. The existing catalogue realtime behavior was left unchanged.

## Changes

- Added `BusLineDetailShared.tsx` with the shared header and timeline.
- Rebuilt `CityBusDetails.tsx` around the shared layout; removed the bordered selects and full-day timetable block.
- Added pure trip-selection/stepping/frequency tests in `apps/web/src/libs/citybus.test.ts`.
- Added translated `set_boarding_stop`, `previous_trip`, and `next_trip` strings; removed detail-only unused dictionary keys from both language trees. The recursive dictionary-shape check reports `true`.
- No changes were made to the accepted city bus listing/catalogue files or `bus/page.tsx`. No commit, push, stash, install, or production write was performed.

## Validation

### Before editing

- `bun run --cwd apps/web type-check` — exit 1; 8 pre-existing diagnostics in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `useDining.ts`, and `worker.ts`.
- `bun run --cwd apps/web test` — `233 pass, 2 skip, 0 fail`, 1,011 expectations, 235 tests across 33 files.

### After editing

- `bun test src/libs/citybus.test.ts` — `7 pass, 0 fail`, 20 expectations.
- `bun run --cwd apps/web test` — `236 pass, 2 skip, 0 fail`, 1,023 expectations, 238 tests across 33 files.
- `bun run --cwd apps/web build` — passed. Existing warnings remained for stale Browserslist data, deprecated Tailwind `@variants`, a pdfjs `eval`, and large chunks.
- `bun run --cwd apps/web type-check` — exit 1 with the same 8 pre-existing diagnostics; no changed-file diagnostics.
- `bun run --cwd apps/web type-check:test` — exit 1 on unrelated existing Calendar/campus-map/hooks/laundry test diagnostics; the new city-bus fixture error found on the first run was fixed, and no city-bus diagnostic remains.
- `bunx eslint src/features/bus/BusLineDetailShared.tsx "src/app/[lang]/(mods-pages)/bus/[route]/[line]/CityBusDetails.tsx" "src/app/[lang]/(mods-pages)/bus/[route]/[line]/page.tsx" src/libs/citybus.ts src/libs/citybus.test.ts` — blocked before linting because the installed repository config cannot resolve `@typescript-eslint/recommended`.
- `git diff --check` — passed.
- Dictionary shape check — `dictionary_key_shape_equal=true`.

### Real data and browser checks

- Started `bun run --cwd apps/web dev -- --port 5182 --strictPort`.
- `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:5182/zh/bus/main/green`, `.../fallback_data/citybus/routes/83.json`, and the double-encoded 先導公車 fallback URL each returned HTTP 200.
- At 390x844 in Playwright, `/zh/bus/city/83` rendered real per-stop times and marked `清大南大校區`; `/zh/bus/city/先導公車` rendered real per-stop times and marked `清華大學`. The trip stepper changed the selected departure, and clicking a boarding-stop action changed the URL to the selected stop.
- The committed pre-change shuttle module was rendered temporarily and immediately restored. The before/after screenshot comparison was 390x844 with `differing_pixels=0`.
- A local `origin/main` shuttle render and a read-only deployed GET baseline were also captured. The deployed page is data/time dependent, so it was not used for the exact zero-pixel before/after claim.

## Screenshots

Saved outside the repository under `C:\Users\chewt\AppData\Local\Temp\citybus-agent`:

- `shuttle-green-before.png`
- `shuttle-green-after.png`
- `shuttle-green-origin-main-local.png`
- `shuttle-green-origin-main.png`
- `city-83-zh-light.png`
- `city-pilot-zh-light.png`

No screenshot directory was added under `docs/agent-reports`.

## Unverified / maintainer questions

- The detail timeline is schedule-backed; authenticated production realtime trip matching was not verified. Please confirm whether a future realtime payload will expose a stable trip identity and per-stop arrivals for merging here.
- No checked-in frequency route was available for the visual browser check; frequency rendering is covered by unit tests.
- The branch remains uncommitted and the local dev server should be stopped after review.
