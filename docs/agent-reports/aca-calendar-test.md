# ACA calendar test investigation

- Root cause: the test fixture is a time bomb. `aca-calendar.ts` calls `readStoredSelectionSchedules()`; its default `now = new Date()` rejects cache rows older than `MAX_SELECTION_CACHE_AGE_MS` (36h).
- The fixture was fetched at `2026-10-09T18:00:00Z`; the first failing instant is `2026-10-11T06:00:00.001Z`. At that point the stored round-1 phase is discarded, so Google round-1 is no longer suppressed and no scraped event is emitted.
- Reproduction before the fix: `bun test src/aca-calendar.test.ts` alone was 9 pass/1 fail; the targeted test passed at 2026-10-10 and 2026-10-11 00:00Z, passed exactly at 2026-10-11 06:00Z, and failed at 2026-10-12 and 2027-01-01.
- The same pinned-current failure occurred with `TZ=UTC`, `Asia/Taipei`, and `America/Los_Angeles`; running the file alone also rules out test-order/shared-state leakage.
- Linux CI would fail from `2026-10-11 06:00:00.001Z` onward while this fixture remains unchanged. The green run at 2026-10-11 05:07Z was before the boundary; it is failing on Linux now (2026-10-12).
- Production verdict: no production-code defect demonstrated. The 36h cache freshness rule intentionally stops using stale scraped data; the endpoint falls back to the Google phase, without duplicate suppression. This test was asserting fresh-cache behavior with a stale fixture.
- Fix: pin only the affected test to `2026-10-10T00:00:00Z` with Bun `setSystemTime`; shared `afterEach` calls `setSystemTime()` to restore the clock.
- Date-dependent test audit: no other `services/api/src/**/*.test.ts` assertion flips within the next 12 months, so none required fixing. `citybus.test.ts:240,263,284` uses `Date.now()` only for relative synthetic timestamps (no flip date); selection-date and weather tests pass explicit dates; ICS default timestamps are not asserted against today.
- Verification: `bun test src` = 520 pass, 0 fail, 7,150 expects across 43 files.
- Full suite with clock preload at 2026-10-12, 2027-01-12, and 2027-10-12: 520 pass, 0 fail on each run.
- `bunx tsc --noEmit -p .` = 0 errors; Prettier check on `services/api/src/aca-calendar.test.ts` passed.
