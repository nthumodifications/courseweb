# City bus implementation report

Date: 2026-10-06  
Issue: [#306](https://github.com/nthumodifications/courseweb/issues/306)  
Worktree: `cw-wt/f-citybus`  
Status: final Round 4 state, intentionally uncommitted.

## Scope and source evidence

The repository instructions and README were read before editing. Accepted Round
3 work in this worktree was preserved; this report supersedes its earlier
generated-data and screenshot measurements.

The city-bus snapshot is generated from TDX data by
`tools/citybus/generate.ts`. The intercity request is coordinate-filtered in
`tools/citybus/generate.ts:109-119`; the shared Hsinchu-city test and bounding
box are in `tools/citybus/normalize.ts:39-66`. The generator applies that test
at `tools/citybus/generate.ts:262`, so a stop name such as 清華山莊 is not enough
to include a route.

The current generated catalogue contains 39 routes: 28 ordinary Hsinchu city
routes, one TDX-named `先導公車` route, and 10 intercity stop-only routes. The
incorrect Chiayi routes 7312, 7313, 7319, 7321, and 7323 are absent. The
remaining intercity IDs are 1250, 1728, 1804, 1822, 1865, 1866, 2011, 5608,
9003, and 9010. The static metadata contains 39 per-route files, and the
generator writes minified output at `tools/citybus/generate.ts:326-368`.
The final compact index is 73,569 bytes raw / 13,700 bytes gzip; the complete
fallback directory is 1,297,677 bytes raw / 201,248 bytes gzip. The final
dictionaries each have 1,695 keys with identical key trees.

The final UI uses that static TDX snapshot for route identity and scheduled
departures. It adds a shared shuttle/city row layout, searchable catalogue
groups that disappear when empty, rider-readable direction labels, equivalent
variant merging, next-service-day continuation, and a full-day selected-stop
timetable with dimmed past departures. Real-time is not live in this
worktree: the maintainer must register a TDX client and set the Worker secrets
`TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` before the `/citybus/departures` path
can return live ETAs.

For programme classification, the official [Hsinchu City traffic authority
route list](https://dep-traffic.hccg.gov.tw/ch/home.jsp?id=53&parentpath=0%2C39)
lists 先導公車 separately from ordinary route entries including 81, 83, and
182. The implementation therefore keeps only the TDX route actually named
先導公車 in the pilot group; it does not infer pilot status from the 81/83/182
family.

## Round 3

### Data and payload

- Replaced the intercity 清華/清大 stop-name filter with a stop-city or
  coordinate test. The accepted box is latitude 24.70–24.88 and longitude
  120.90–121.06; a supplied city field takes precedence. Every remaining
  intercity route was regenerated through the same predicate, and the five
  false Chiayi matches were removed.
- Minified every generated JSON file. The index now contains route identity,
  localized names, group, direction labels/destinations, campus-near stop
  IDs/names, and compact stop-name search arrays. Full route stops and
  schedules remain in per-route files. The public index is now 73,569 bytes
  raw / 13,700 bytes gzip, versus 667,202 / 40,525 before; the complete
  fallback directory is 1,297,677 bytes raw / 201,248 bytes gzip, versus
  3,981,926 / 323,739 before. Route files fell from 44 to 39.
- Stop-only intercity routes have no fabricated timetable. Catalogue rows show
  the line/destination, `times_not_available`, and an outbound link to
  `https://www.taiwanbus.tw/`; they are in their own bottom group and are not
  first-run suggestions. The route contract carries `timesUrl` at
  `services/api/src/citybus/types.ts:74,104` and the compact projection is in
  `services/api/src/citybus/index.ts:40-69`.

### Schedule behavior

- Both the Worker logic and the static web fallback scan future service days,
  including the next published day and the following week, rather than
  stopping at today. This is implemented at
  `services/api/src/citybus/logic.ts:122-236` and
  `apps/web/src/libs/citybus.ts:258-367`.
- Next departures now expose a real time plus a countdown. After today's last
  service, the next service day is shown as `明天 06:40` / `Tomorrow 06:40`;
  `no_service` is used only when published service exists but no departure is
  available in the searched window. The pure formatting helpers are at
  `apps/web/src/libs/citybus.ts:124-153`; 60 minutes or more uses hours and
  minutes instead of a large minute count.
- Detail rows put the departure time first and show countdowns only for the
  first two departures. The boarding stop and direction control is above the
  list; two directions use a segmented toggle, while multi-direction routes
  use TDX rider-facing labels and merge variants with identical boarding-stop
  times and destinations. Route 83 and the pilot route were checked again in
  Round 4. The old 此站發車 text is now a time-basis caption.

### Layout and interaction

- When pins exist, `我的公車` is rendered above the tabs in
  `apps/web/src/app/[lang]/(mods-pages)/bus/page.tsx:467-477`. Campus and city
  pins use the same `BusListingItem`; with no pins the normal campus shuttle
  tabs remain unchanged.
- The fourth tab is now the explicit `新增路線` / `Add a line` entry rather
  than a fake campus stop. `CityBusSelectedLines` and the catalogue are in
  `apps/web/src/features/bus/CityBusCatalogue.tsx:249-354`.
- City lines use `CityBusLineBadge` for named blue/green lines, the pilot
  colour, or a neutral badge (`apps/web/src/features/bus/CityBusLineBadge.tsx`).
  Catalogue rows are compact and searchable immediately by route number/name,
  destination, or compact stop-name metadata. While searching, empty groups
  are hidden; the pilot caption explains that TDX supplies one route with
  multiple directions, and an empty search state is explicit.
- The widget now resolves compact `campusStops` metadata and uses the same
  countdown/time helpers at `apps/web/src/components/Widgets/BusWidget.tsx:48-188`.
- All new visible copy is in both dictionaries. A recursive key check reported
  1,738 English keys and 1,738 Traditional Chinese keys with identical key
  trees.
- The static route URL is double-encoded in
  `apps/web/src/libs/citybus.ts:171` because Vite decodes one URL layer before
  serving encoded Chinese filenames. This was verified by HTTP smoke: a pilot
  route request now returns route JSON rather than the app shell.

### Final screenshots

Round 4 replaced the superseded Round 3 files. These nonblank 390×844 captures
are under `docs/agent-reports/citybus-screens/`:

- `r4-zh-my-buses-light-mobile.png`: one campus shuttle plus 83 and Blue Line
  city pins in `我的公車`.
- `r4-en-catalogue-search-dark-mobile.png`: English dark catalogue searching
  for `83`; only the matching city group remains and the destination wraps.
- `r4-zh-detail-83-light-mobile.png`: 83 stop/direction picker and full-day
  selected-stop timetable.
- `r4-en-detail-pilot-dark-mobile.png`: pilot route detail with a TDX label,
  next departures, and full-day timetable.

Each file was inspected as a real browser capture after the page loaded from
the local Vite server. No dependency or node_modules directory was changed.

## Round 4

- `BusListingItem` now gives campus and city selections the same compact
  anatomy: badge/icon, title, right-aligned time/countdown, star then chevron
  on one line, and metadata indented under the title
  (`apps/web/src/features/bus/BusListingItem.tsx:89-179`).
- Catalogue search now omits zero-match sections and keeps one explicit
  no-results state. Result text is a wrapped route/destination/stop block
  (`apps/web/src/features/bus/CityBusCatalogue.tsx:125-183,436-475`).
- Direction choices use the TDX `labelZh`/`labelEn` values and
  `getDistinctCityBusDirections` removes equivalent destination plus
  boarding-time variants (`apps/web/src/libs/citybus.ts:183-205`;
  `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/[line]/CityBusDetails.tsx:65-78`).
  The UI no longer emits `Variant N`/`變體 N`.
- `getCityBusTimetable` exposes every selected-stop departure, marks past
  entries, and detects distinct weekday/weekend schedules. Detail pages merge
  the static schedule with optional live data, show the next service-day
  header when today has fewer than three remaining entries, and render the
  full-day timetable (`apps/web/src/libs/citybus.ts:338-432`;
  `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/[line]/CityBusDetails.tsx:136-165,337-509`).
- Added pure tests for equivalent-direction merging and full-day timetable
  behavior in `apps/web/src/libs/citybus.test.ts:47-136`; removed the unused
  `direction_variant` dictionary key and added localized `full_day_timetable`.

### Round 4 checks

- Before Round 4: `bun run --cwd apps/web type-check` had 8 unrelated
  diagnostics; `bun run --cwd apps/web test` had 231 passed, 2 skipped, 0
  failed across 33 files.
- After Round 4: `bun test src/libs/citybus.test.ts
  src/features/bus/busPins.test.ts` passed 6 tests / 12 expect calls;
  `bun run --cwd apps/web test` passed 233, skipped 2, failed 0 across 235
  tests / 1,011 expect calls; `bun test services/api/src/citybus.test.ts
  tools/citybus/normalize.test.ts` passed 11 / 22 expect calls.
- `bun run --cwd apps/web build` passed. Existing Browserslist, deprecated
  Tailwind, pdfjs eval, and large-chunk warnings remain.
- `bun run --cwd apps/web type-check` still reports exactly the same 8
  unrelated diagnostics and no city-bus file. The changed-file
  `bunx eslint ...` command is blocked before linting because the linked
  checkout cannot resolve `@typescript-eslint/recommended`.
- `bun run design-lint` still exits 1 on existing findings in unrelated
  course, library, grades, venue, campus-map, local-search, and UI files; it
  reported zero new city-bus findings. `bunx prettier --check` on all changed
  Round 4 TS/TSX/JSON files and `git diff --check` passed. English and
  Traditional Chinese dictionaries each contain 1,695 keys with identical
  sorted key sets.
- Browser command: process-only
  `VITE_COURSEWEB_API_URL=http://localhost:5182/__api bun run --cwd apps/web
  dev -- --port 5182 --strictPort` (the checked-in development env pointed at
  an unavailable local Worker). Read-only GETs returned 200 for the two bus
  pages, the compact index, route 83, the encoded pilot route, and
  `/__api/bus`; production `https://api.nthumods.com/bus` returned 200, while
  production `/citybus/routes` and `/citybus/departures` returned 404. The
  browser therefore verified real static fallback data and the existing bus
  API, but not live city-bus ETAs.
- The four final screenshots above were captured at 390×844 through an
  ephemeral Chrome CDP/Bun command. Superseded `r3-*.png` files were removed;
  no code or dependency installation was used, and no production write was
  made.

## Commands and results

### Baseline before Round 3 edits

- `bun run --cwd apps/web type-check`: failed with 8 existing diagnostics:
  three each in `GenericIssueFormDialog.tsx` and `IssueFormDialog.tsx`, one in
  `features/dining/useDining.ts`, and one in `worker.ts`. No city-bus file was
  involved.
- `bun test --cwd apps/web`: 229 passed, 2 skipped, 0 failed.
- `bun test services/api/src/citybus.test.ts tools/citybus/normalize.test.ts`:
  10 passed, 0 failed.
- `bun run --cwd apps/web build`: passed.
- `bun run design-lint`: non-zero because of repository baseline findings;
  this was recorded before editing and no dependency installation was used.

### After Round 3 edits

- `bun test services/api/src/citybus.test.ts tools/citybus/normalize.test.ts`:
  **11 passed, 0 failed, 22 expect calls**.
- `bun test --cwd apps/web src/libs/citybus.test.ts src/features/bus/busPins.test.ts`:
  **4 passed, 0 failed, 8 expect calls**.
- `bun test --cwd apps/web`: **231 passed, 2 skipped, 0 failed, 1,007 expect
  calls**. The logged local-search errors are synthetic test cases; the suite
  passed.
- `bunx tsc --noEmit -p services/api/tsconfig.json`: **passed**.
- `bun run --cwd apps/web type-check`: still has exactly the same **8 unrelated
  diagnostics** listed above; no changed city-bus file is reported.
- `bun run --cwd apps/web build`: **passed**. Existing Browserslist, deprecated
  Tailwind directive, pdfjs eval, and large-chunk warnings remain.
- `bun run design-lint`: still exits 1, but reports **zero city-bus findings**;
  all reported violations are unrelated existing files.
- `bun tools/citybus/generate.ts`: **Wrote 39 routes** from the checked-in raw
  snapshot; this regenerated the minified API data, compact index, and 39
  per-route files without fetching or modifying production.
- Targeted `bunx eslint` on changed bus/page/detail/widget/catalogue/badge/
  library files: could not start because the linked checkout's shared config
  cannot resolve `@typescript-eslint/recommended`.
- `bunx prettier --write` on touched TS/TSX/JSON source files: completed.
- `git diff --check`: passed.
- Static generator metadata check: 39 routes, 39 route files, no excluded ID
  present and no operator-only fields in the compact index; index 73,569 raw /
  13,700 gzip; complete set 1,297,677 raw / 201,248 gzip.
- Local dev server command used was
  `VITE_COURSEWEB_API_URL=http://localhost:5182/__api bun run --cwd apps/web dev -- --port 5182 --strictPort`.
  HTTP GETs returned 200 for `/zh/bus?tab=north_gate`, `/en/bus?tab=city`, the
  compact index, route 83, and the encoded pilot route. The city Worker API
  proxy returned 404, so the browser used the static fallback as designed.
- Production read-only GETs: `https://api.nthumods.com/bus` returned 200;
  `https://api.nthumods.com/citybus/routes` returned 404. No production POST,
  PUT, or DELETE was made.
- The temporary screenshot command was `node
  docs/agent-reports/capture-citybus.cjs`; it waited for compiled nonblank DOM
  content before each capture and was removed afterward.

## Unverified and open questions

- The Worker has not been deployed. TDX ETA OAuth was not live-tested because
  no client credentials were available. After deployment, verify
  `/citybus/routes`, `/citybus/departures`, CORS, and the Worker function's
  active state.
- Intercity schedules and ETAs remain unavailable in this snapshot. A
  maintainer with TDX quota/credentials should fetch a route-filtered
  `Schedule/InterCity` response and regenerate before promising departure
  times. The generic Taiwanbus landing page may later be replaced with a more
  specific operator/route URL if the authority exposes one.
- The Hsinchu coordinate box is intentionally conservative enough for the
  current city boundary but should be rechecked if TDX supplies a stop with a
  city field that conflicts with its coordinates.
- The official authority page and TDX naming support the current one-route
  pilot classification, but the maintainer should decide whether future
  programme policy should classify additional route families independently of
  TDX route names.
- Bus pins remain local because no signed-in bus-preference sync contract was
  found in this checkout.
