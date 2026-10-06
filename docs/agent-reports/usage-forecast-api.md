# Usage forecast API report

## Result

Implemented the API-side usage history collector, seasonal forecast/anomaly model, cached snapshots, local seed tooling, and `/usage/:source/forecast` endpoint. The fixed contract in `services/api/src/usage/types.ts` was not changed. `GET /venue/occupancy` was not changed.

## Files

Changed:

- `services/api/src/index.ts` — mounts `/usage` and dispatches the Monday and ten-minute cron strings separately.
- `services/api/src/prisma/schema.prisma` and `schema.previous.prisma` — adds `UsageSlot`, `UsageSeriesMeta`, and `UsageAnomalyState` models.
- `services/api/wrangler.toml` — adds `*/10 * * * *`.

Added:

- `services/api/migrations/20261006_000000_usage_forecast.sql`
- `services/api/src/usage/collector.ts`, `index.ts`, `model.ts`, `collector.test.ts`, and `model.test.ts`
- `services/api/scripts/seed-usage.ts`

The supplied untracked `services/api/src/usage/types.ts` was retained as the contract source of truth. The other agent's `apps/` changes were left untouched.

## Migration and storage

`20261006_000000_usage_forecast.sql` creates:

- `UsageSlot`, keyed by `(source, seriesId, date, slot)`, with the `(source, seriesId, date)` range index, rollup statistics, and the latest raw value/sample time.
- `UsageSeriesMeta`, keyed by a source/series id and storing name, first/last local date, latest value/sample, last value-change time, and last successful collector time.
- `UsageAnomalyState`, keyed by source/series id, storing the active anomaly run type, `since`, sample count, and last observation time.

Profiles and source snapshots are compact JSON values in `Cache`. Profile arrays are rounded to one decimal. The retention marker is also in `Cache`; the slot delete runs no more than once per 24 hours and removes dates older than 400 days.

## Local commands and output

Migration, seed, and dev commands below were run from `C:\Users\chewt\Repositories\cw-wt\usage\services\api`; the curl commands can run from any shell. All use local D1 only:

```powershell
bun run prisma:migration:apply:local
```

The migration command applied all nine local migrations, including `20261006_000000_usage_forecast.sql`, with status `✅`.

For an isolated local D1 persistence directory used for the successful end-to-end pass:

```powershell
$persist = Join-Path $env:TEMP "nthumods-usage-e2e-1007"
New-Item -ItemType Directory -Path $persist -Force | Out-Null
bunx wrangler d1 migrations apply data-d1 --local --persist-to $persist
bun scripts/seed-usage.ts --persist-to $persist
```

Seed output:

```text
🚣 6 commands executed successfully.
Seeded gym=5 library=2 dateRange=2026-08-26..2026-10-06 closedDate=2026-09-27
```

The seed fetches the live library response once, uses two real zones for a quick local run, and generates 42 days of deterministic weekday/weekend-shaped history, noise, and one closed day for both sources. It rejects `--remote` and always invokes Wrangler with `--local`. The production collector is not limited to two library zones.

Start the worker:

```powershell
bunx wrangler dev --local --persist-to (Join-Path $env:TEMP "nthumods-usage-e2e-1007") --port 8787
```

Trigger one ten-minute tick in another shell:

```powershell
curl.exe -sS -i "http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=*/10%20*%20*%20*%20*"
```

Actual tick response:

```text
HTTP/1.1 200 OK
Content-Length: 2
...
ok
```

Endpoint checks:

```powershell
curl.exe -sS "http://127.0.0.1:8787/usage/gym/forecast"
curl.exe -sS "http://127.0.0.1:8787/usage/library/forecast"
```

Trimmed actual response summary:

```json
{
  "gym": {
    "kind": "occupancy",
    "date": "2026-10-07",
    "seriesCount": 5,
    "statuses": ["ready"],
    "firstSeries": {
      "id": "c4ff46db-69ea-11f0-832d-00155d32d802",
      "name": "桌球館",
      "status": "ready",
      "weeks": 7,
      "capacity": 53,
      "quality": {"mae": 1.1, "naiveMae": 1.6, "skill": 0.3, "samples": 1632}
    }
  },
  "library": {
    "kind": "vacancy",
    "date": "2026-10-07",
    "seriesCount": 3,
    "statuses": ["ready", "learning"],
    "firstSeries": {
      "id": "1_5A",
      "name": "5F-研究小間A",
      "status": "ready",
      "weeks": 7,
      "capacity": 20,
      "quality": {"mae": 1.3, "naiveMae": 1.5, "skill": 0.1, "samples": 1632}
    }
  }
}
```

The actual header check was `HTTP/1.1 200 OK` and `Cache-Control: public, max-age=300`.

## D1 budget

Let `G` and `L` be the number of successfully fetched gym/library series, `N = G + L`, `P <= 2` the profiles rebuilt in a tick, `A` the anomaly states that changed, and `D` the number of rows deleted by the once-daily retention pass.

Per successful collector tick, the collector uses one `DB.batch` for each successful source and writes `2G + 2L` rows/updates: one `UsageSlot` and one `UsageSeriesMeta` row per series. Snapshot work then writes `P` profile-cache rows, two source snapshot-cache rows, and `A` anomaly-state rows. On the retention tick it additionally writes one retention marker and deletes `D` old slot rows. Thus the normal warm-cache write count is `2N + P + 2 + A`; the daily retention tick adds `1 + D`.

Every tick reads one joined metadata/profile/state row per known series, one retention-marker row, and the current-date slot rows (at most 48 per series). Each profile rebuild adds one 8-week range query returning at most `56 * 48 = 2,688` slot rows for that series. Therefore the per-tick read bound is `N + 1 + current-day rows + up to 2 * 2,688` rows; a warm tick has no history-range reads. The endpoint reads exactly one `Cache` snapshot row and performs no history/model query.

With 40 production series and successful upstreams, the collector's steady-state upper bound is 80 slot/meta row updates per tick and 11,520 per 24-hour day (144 ten-minute ticks), plus 288 snapshot rows, approximately 40 profile rows as each profile ages through its 24-hour TTL, one retention marker, and changed anomaly states. The current local seed had seven known series before the live tick added a third library zone.

## Tests and checks

```text
bun test src
167 pass
0 fail
449 expect() calls

bunx tsc --noEmit -p .
TSC_STATUS=0

DATABASE_URL=file:usage-schema-check.db bunx prisma validate --schema ./src/prisma/schema.prisma
The schema at src\prisma\schema.prisma is valid 🚀

DATABASE_URL=file:usage-schema-check.db bunx prisma generate --schema ./src/prisma/schema.prisma
Generated Prisma Client (v6.15.0)
```

The focused usage tests cover fixed UTC+8 boundaries, seeded deterministic model generation, median robustness, cold start, forecast backtesting/skill, anomaly debounce and precedence, vacancy direction, stale detection, malformed payload rejection, independent upstream failure, and the descriptive user agent.

## Deviations and limitations

- The local seed uses two live library zones rather than all approximately 35 zones to keep local D1 execution quick; it still fetches real zone ids/names and exercises both sources. Production collection accepts every valid library row.
- The first seed attempt against the default Wrangler persistence was interrupted after the generated one-row-per-slot file became impractical. A subsequent multi-row attempt exposed a Wrangler/Miniflare Windows `HashIndex detected hash table inconsistency`/`ECONNRESET` failure. The successful verification used a fresh isolated `--persist-to` directory and a recursive CTE seed file, which completed successfully. This is a local tooling limitation, not an application response failure.
- The endpoint sample includes one `learning` library series because the live collector saw a third zone that was not part of the two-zone seed. Seeded series were `ready` with populated quality/forecast data.
- No remote database, deployment, commit, push, `gh`, or remote Wrangler command was used.

## Second pass

### Changes

- Reworked `backtest` to index `(dow, slot)` and `(dayType, slot)` observations once, sort each list by date, and advance incremental prior-value sets before scoring each date. The prediction and seasonal-naive eligibility rules are unchanged. `buildProfile` now appends to fixed cell arrays instead of reallocating `[...existing, value]` for every observation.
- Added a reference-backtest equivalence test and a 56-day × 48-slot timing guard. The first-pass measurement was approximately 138 ms; the optimized implementation measured a 14.087 ms median across nine runs on this machine (runs: 11.652, 12.503, 12.597, 13.556, 14.087, 14.093, 19.063, 20.437, 21.527 ms).
- Extracted pure `assembleUsageSnapshot`. A missing cached profile now uses an in-memory empty profile and emits the series as `learning` with its current value. It is not inserted into the profile map or profile cache, so it remains due for a real rebuild.
- Added `UsageSeries.week` with seven 48-slot weekday arrays. Ready values come from the profile baseline; profile `closed` slots are `null`; learning returns `[]`. `today[].expected` deliberately remains numeric for closed slots to preserve the existing all-48-slot expected timeline and backwards semantics. The week picker uses `null` for unavailable slots because it is a selectable typical-week view.
- Added `scripts/usage-demo-snapshot.ts`. It uses deterministic campus-shaped history, real model/profile code, and consecutive simulated forecast inputs to produce `busier`, `quieter`, `unexpected_closed`, and `stale` anomalies without hand-writing anomaly objects.
- Updated `scripts/seed-usage.ts` to seed every valid live library zone. The remote refusal remains in place.

### Required checks

Full API test and type-check output:

```text
bun test src
170 pass
0 fail
458 expect() calls

bunx tsc --noEmit -p .
TSC_STATUS=0
```

The test run prints expected error text from existing dining/auth failure-path tests, but all 170 tests pass. Focused usage tests also passed: `13 pass`, `0 fail`, `50 expect() calls`.

Demo generator verification at `2026-10-07T18:30:00+08:00`:

```text
gym mixed:    series=5  statuses=ready              anomalies=busier,quieter,stale,unexpected_closed
gym learning: series=5  statuses=learning           anomalies=
gym empty:    series=0  statuses=                   anomalies=
library mixed:    series=9  statuses=ready           anomalies=busier,quieter,stale,unexpected_closed
library learning: series=9  statuses=learning        anomalies=
library empty:   series=0  statuses=                anomalies=
```

Snapshot serialization measurements use compact JSON and gzip. The gym payload is the five-series ready demo snapshot: `28,632` raw bytes / `4,221` gzip bytes. The library measurement uses the 35 live zone ids/names with ready demo-shaped series; before the size rule it was `198,180` raw / `24,427` gzip, so `week` values were rounded to integers. The emitted all-ready-sized payload was `192,089` raw bytes / `22,106` gzip bytes.

### Fresh local end-to-end

Commands used a new local persistence directory:

```text
PERSIST=C:\Users\chewt\AppData\Local\Temp\nthumods-usage-e2e-second-pass-dc4581d76fd74203a0124a1db7c61dcd
bunx wrangler d1 migrations apply data-d1 --local --persist-to C:\Users\chewt\AppData\Local\Temp\nthumods-usage-e2e-second-pass-dc4581d76fd74203a0124a1db7c61dcd
... 9 migrations ... 20261006_000000_usage_forecast.sql ✅
bun scripts/seed-usage.ts --persist-to C:\Users\chewt\AppData\Local\Temp\nthumods-usage-e2e-second-pass-dc4581d76fd74203a0124a1db7c61dcd
Seeded gym=5 library=35 dateRange=2026-08-26..2026-10-06 closedDate=2026-09-27
bunx wrangler dev --local --persist-to C:\Users\chewt\AppData\Local\Temp\nthumods-usage-e2e-second-pass-dc4581d76fd74203a0124a1db7c61dcd --port 8787
curl.exe .../cdn-cgi/handler/scheduled?cron=*/10%20*%20*%20*%20*
HTTP/1.1 200 OK
```

After that single tick, trimmed endpoint inspection was:

```text
gym:     seriesCount=5,  statuses=learning,ready, weekShape=7x48
library: seriesCount=35, statuses=learning,      weekPresent=35, learningCount=35
```

Both endpoints returned `HTTP/1.1 200 OK`, `Content-Type: application/json`, and `Cache-Control: public, max-age=300`. The local Worker was stopped after verification. The single-tick library result intentionally has all 35 rows but only the profile rebuild budget's real profiles; later ticks can build the remaining profiles.

### Gaps

- No remote database, deployment, commit, push, `gh`, or `wrangler --remote` command was used.
- The live one-tick check cannot make all approximately 35 library profiles ready because the collector intentionally rebuilds at most two per tick. The all-ready library byte measurement therefore uses the live 35-zone identity list with deterministic ready demo-shaped series, and is a serialization-size check rather than a claim that all 35 were rebuilt in that one local tick.

## Third pass

### Changes

- Fixed anomaly flapping in `anomalyDecision`. The two-hour no-change stale rule now ignores the current closed state, while the 30-minute no-successful-sample rule remains immediate and higher precedence. The no-change gate now measures the baseline range from the last-change slot through the current slot, or from slot 0 when the last change was on an earlier local day. This keeps the material-movement decision true for the unchanged run and preserves a single `unexpected_closed.since` through a holiday or fully vacant library zone.
- Added deterministic model tests for the complete 10-minute holiday and vacancy timelines, a genuinely stuck open sensor, and a small non-zero overnight closed-state reading. The existing anomaly tests remain passing.
- Exported `MAX_PROFILE_REBUILDS_PER_TICK = 2` and used it for the collector cap. At two rebuilds per ten-minute tick, 40 profiles refresh in 20 ticks (about 3 hours 20 minutes), within the 24-hour profile TTL. The per-tick history-read bound is now `2 * 2,688` rows.
- Clamped demo-generated actuals to each declared series capacity. The mixed demo also keeps its first simulated anomaly sample in the same half-hour slot when a ten-minute step would cross a boundary, and retains a bounded gym evening shape so all four demonstrations remain detectable after clamping.

### Required checks

```text
bun test src
175 pass
0 fail
576 expect() calls
Ran 175 tests across 15 files.

bunx tsc --noEmit -p .
TSC_STATUS=0
```

The full test run still prints the existing dining/auth failure-path logs and mocked AI provider failures; they are expected test output and do not represent failed tests.

Demo generator verification at `2026-10-07T18:30:00+08:00` (`2026-10-07T10:30:00.000Z`):

```text
gym:     series=5 anomalies=busier,quieter,stale,unexpected_closed minActual=0 negativeCount=0 outOfBoundsCount=0
library: series=9 anomalies=busier,quieter,stale,unexpected_closed minActual=0 negativeCount=0 outOfBoundsCount=0
```

The bounds check used the generator's declared `DemoSeries.capacity`; all emitted observed `today[].actual` values were within `[0, capacity]`.

### Gaps

- No commit, push, deployment, `gh`, or remote Wrangler command was run.
- No new local D1/Worker end-to-end run was performed in this pass; the checks above are pure model/collector tests, TypeScript validation, and local deterministic demo generation.
