# City bus real-time report

## Result

Real-time support is implemented end to end and remains opt-in: without
`TDX_CLIENT_ID` and `TDX_CLIENT_SECRET`, the API returns `200` with
`realtime: false` and the existing timetable UI is preserved. With credentials,
the Worker makes one ETA request and one near-stop request per route snapshot,
shares the result through memory/Cache API caching, and exposes the live result
to the list rows, widget, and line detail.

No production credentials, production writes, deployment, commit, or push were
performed. The worktree is intentionally left uncommitted.

## TDX proof and findings

I made four data requests, below the task limit of eight, and saved every raw
response under the ignored `tools/citybus/raw/` directory:

| Request | Result | Saved response |
| --- | --- | --- |
| `GET https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Hsinchu/83?$format=JSON` | `200`, 107 records | `eta-city-hsinchu-83.json` |
| Same endpoint for URL-encoded `藍線` | `200`, `[]` | `eta-city-hsinchu-blue.json` |
| Same endpoint for route `50` | `200`, `[]` | `eta-city-hsinchu-50.json` |
| `GET https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeNearStop/City/Hsinchu/83?$format=JSON` | `200`, `[]` | `nearstop-city-hsinchu-83.json` |

No `429` occurred. The official schema reference used was the [TDX API
service Swagger](https://tdx.transportdata.tw/api-service/swagger).

The real 83 response was captured at `2026-10-08T02:35` Taiwan time, outside
normal service. All 107 records had `StopStatus: 1`, `PlateNumb: "-1"`, and
`StopCountDown: 0`; it contained `StopCountDown`, `UpdateTime`, and `DataTime`,
but no `EstimateTime`, `NextBusTime`, `SrcUpdateTime`, or running near-stop
records. The implementation therefore supports the documented
`EstimateTime`/`SrcUpdateTime` fields and the observed `StopCountDown` and
`UpdateTime` fallbacks, while preserving status 1 as “not yet departed” rather
than displaying a zero-minute arrival.

The 83 response contained six subroutes: `HSZ000801`, `HSZ000802`, `HSZ0008A1`,
`HSZ0008A2`, `HSZ0008B1`, and `HSZ0008B2`, with directions 0/1. Joining
`StopUID` to static data was complete for all six directions: 20/20, 20/20,
13/13, 12/12, 21/21, and 21/21 stops respectively. Static IDs are the
`HSZ...` UID form while the response also supplies numeric `StopID`; the
implementation prefers `StopUID` and has a numeric-suffix fallback.

## Design and changes

- Code evidence: API route handlers are in `services/api/src/citybus/index.ts:136-169`,
  shared snapshot caching/fetching in `services/api/src/citybus/realtime.ts:9-30`
  and `:230-286`, and stop/subroute response construction in
  `services/api/src/citybus/realtime.ts:293-397`.
- Web evidence: pure display and timeline helpers are in
  `apps/web/src/libs/citybus.ts:207-285`; the short-timeout client and visible
  polling are at `:795-843`; detail live-mode selection and tabs are in
  `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/[line]/CityBusDetails.tsx:201-319`.

- `services/api/src/citybus/realtime.ts` owns the per-route snapshot, exact
  `SubRouteUID`/direction selection, stop joining, status mapping, token
  reuse, Cache API plus in-memory cache, single-flight fetches, 20-second
  freshness, and 2-minute stale-on-error fallback.
- `services/api/src/citybus/index.ts` adds `/citybus/eta` and makes
  `/citybus/departures` use the same snapshot. Responses include every static
  stop, `buses`, `updatedAt`, and `realtime`; responses carry
  `Cache-Control: public, max-age=15`. Missing credentials and expired
  unrecoverable upstream data are non-error `realtime: false` responses.
- `apps/web/src/libs/citybus.ts` adds the short-timeout ETA client, visible-only
  20-second React Query polling, session-level silent disablement for 404 or
  `realtime: false`, and pure display/timeline merge helpers.
- The list, widget, and detail keep their existing markup/classes. Live data
  only replaces the time/source slots. The detail adds `即時 | 時刻表` only
  when live data exists, uses the existing timeline bus states, and shows the
  TDX update time.
- Traditional Chinese and English dictionaries remain structurally identical;
  both contain 1,758 keys.
- Tracked fixtures include a trimmed real 83 response sample plus documented
  status 0/1/2/3/4 and near-stop samples for deterministic tests.

## Commands and verification

Baseline, before editing:

- `bun run --cwd apps/web type-check` — failed with two existing errors only:
  `apps/web/src/features/dining/useDining.ts:20` (`dining` missing) and
  `apps/web/worker.ts:856` (`CacheStorage.default` missing).
- `bun --no-env-file test src` in `apps/web` — 269 passed, 2 skipped, 0
  failed, 1,098 expectations.
- `bun test src` in `services/api` — 188 passed, 0 failed, 628 expectations.

After editing:

- `bun test src` in `services/api` — 198 passed, 0 failed, 649 expectations.
- `bun --no-env-file test src` in `apps/web` — 271 passed, 2 skipped, 0
  failed, 1,104 expectations.
- `bun --no-env-file test src/libs/citybus.test.ts` — 9 passed, 0 failed.
- `bunx tsc --noEmit -p services/api/tsconfig.json` — passed.
- `bun run --cwd apps/web type-check` — still reports only the same two
  baseline errors; no changed-file error was added.
- `bun run --cwd apps/web build` — passed; Vite built 7,269 modules. Existing
  warnings remain for browserslist data, Tailwind `@variants`, pdfjs eval,
  dynamic Supabase import, and large chunks.
- Prettier check over all changed files — passed. `git diff --check` — passed.
- Targeted ESLint commands were attempted for the changed API and web files,
  but the repository ESLint config fails before linting because
  `packages/eslint-config/index.js` references unavailable
  `@typescript-eslint/recommended`.

The Worker route was also run in a Bun script with fake fetch/cache bindings
against the saved responses. For 83 direction `HSZ000801`, `/citybus/eta`
returned `200`, 20 stop entries, `realtime: true`, `buses: []`, and the raw
update time. The script also verified token reuse, cache hit/miss, stale-on-
error, status 0/1/2/3/4, near-stop mapping, and all-direction join
completeness.

For the UI check, I ran a local fixture API on port 5183 and the web dev
server on the required port 5182, resized Playwright to 390x844, selected two
city lines, and loaded the 83 detail. The page and API returned HTTP 200. The
synthetic fixture showed the expected `3 分鐘`, `進站中`, `末班車已過`, `今日未營運`,
`即時`, `時刻表`, and `更新於 02:35` states; the detail also showed the existing
at-station bus glyph. I inspected these screenshots:

- `C:\Users\chewt\AppData\Local\Temp\citybus-realtime-bus-page-390x844.png`
- `C:\Users\chewt\AppData\Local\Temp\citybus-realtime-83-390x844.png`

The screenshots use synthetic fixture data because the real TDX probe had no
running bus. They verify layout/rendering and state presentation, not live
service availability. The citybus request had no browser error after adding
local CORS; unrelated read-only proxy requests for `/bus` and `/acacalendar`
were refused in this environment and are not citybus failures. Both temporary
servers were stopped after the check.

## Maintainer setup and quota planning

1. Register for a free member account at `https://tdx.transportdata.tw`.
2. Create a TDX API key and obtain the client ID and secret.
3. From `services/api`, run:

   ```powershell
   bunx wrangler secret put TDX_CLIENT_ID
   bunx wrangler secret put TDX_CLIENT_SECRET
   ```

   Alternatively add them in Cloudflare Dashboard → Worker `nthumods-api` →
   Settings → Variables and Secrets. Never put the values in source or logs.

The 20-second per-route cache means one continuously requested route can cause
at most 3 ETA calls/minute and 3 near-stop calls/minute: `routes × 3 × 2`
upstream endpoint GETs/minute. This repository has 39 static routes, so a
worst-case all-route poll is 234 endpoint GETs/minute (336,960/day), in
addition to an occasional token request. The unauthenticated probe limit was
described as about 20 requests per IP per day, but the authenticated key quota
was not available from this run. Therefore the free tier cannot be claimed as
sufficient for the worst case without checking the registered account quota;
the shared cache does make actual volume proportional to routes students are
actively viewing, not to individual students.

## Unverified / open questions

- No authenticated TDX response was possible because this checkout had no
  credentials. Confirm the production response’s `EstimateTime`, `NextBusTime`,
  `SrcUpdateTime`, and `RealTimeNearStop` event values after secrets are set.
- The real 83 near-stop response was empty because the probe was outside
  service. The implementation accepts the documented/string and numeric event
  forms, but a live event should be confirmed.
- Confirm the TDX account’s authenticated rate quota and decide whether all
  39 routes should be continuously viewable or whether polling should be
  further limited operationally.
- Production deployment and production endpoint verification remain for the
  maintainer; no production API was written by this task.
