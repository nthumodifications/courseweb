# Agent reports — multi-track work, 2026-09-10

Seven parallel tracks, one report each. Branch: `feat/multi-track`, based on `main` @ `ce09dd0b`.

| Report                       | Track                                                        | Kind          |
| ---------------------------- | ------------------------------------------------------------ | ------------- |
| [i18n.md](i18n.md)           | Translation audit; zh-TW as the consistent primary locale    | audit + fixes |
| [calaudit.md](calaudit.md)   | Calendar feature audit                                       | audit only    |
| [dashboard.md](dashboard.md) | Upcoming dates on the dashboard                              | feature       |
| [timetable.md](timetable.md) | User-defined timetable activity blocks + appearance controls | feature       |
| [changelog.md](changelog.md) | Changelog page and what's-new dialog                         | feature       |
| [announce.md](announce.md)   | Database-driven announcement bar                             | feature       |
| [recruit.md](recruit.md)     | Maintainer recruitment page with resume upload               | feature       |

## Verification of the integrated branch

Run from the repo root unless noted.

| Check                                                     | Result                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `cd apps/web && bunx tsc --noEmit`                        | 8 errors — exactly the pre-existing `main` baseline (shops, Issue forms, `worker.ts`); only a line-number shift |
| `cd services/api && bunx tsc --noEmit`                    | 0 errors, matching `main`                                                                                       |
| `cd apps/web && bunx vite build`                          | passes                                                                                                          |
| `cd apps/web && bun test src/features/campusMap`          | 9 pass                                                                                                          |
| `cd apps/web && bun test src/hooks/syncedStorage.test.ts` | 4 pass                                                                                                          |
| `cd services/api && bun test`                             | 96 pass                                                                                                         |
| Dictionary parity                                         | 1130 keys, `en.json` and `zh.json` identical key trees, superset of all seven branches                          |

Nothing here was verified in a browser. No migration was applied and nothing was deployed.

## Blocking manual steps before any of this ships

1. **Announcement bar** — apply `packages/database/migrations/20260910_120000_add_alert_announcement_fields.sql`. It enables RLS on `public.alerts`, which no other table in this repo does; confirm no other consumer reads that table with a non-`anon` role first.
2. **Recruitment** — apply `packages/database/migrations/20260910_120000_create_recruitment.sql`, then confirm the private `resumes` bucket exists with the restrictive policy. Confirm the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` Worker secrets.
3. **Recruitment client types** — `bun run build:api-types` before the web app can call `/recruit` through the typed client. This currently fails on pre-existing `TS2742` errors in `services/api/src/config/algolia.ts`, which are unrelated to this work but do block the rebuild.
4. **Supabase generated types were hand-edited** (`apps/web/src/types/supabase.ts`, `services/api/src/types/supabase.ts`). Re-run the `gentype` scripts after the migrations are applied and diff the result.
5. **Privacy policy** does not yet mention recruitment applications, resumes, reviewer access, retention, or deletion. It needs updating before the recruitment form collects real data.

## Corrections made during manager review

- **`recruit`** shipped a PERMISSIVE storage policy with `USING (false)`. Permissive policies are OR-ed, so it granted nothing but forbade nothing — any other permissive policy on `storage.objects` would still have exposed the bucket — and it was unscoped, applying to every bucket. Replaced with a RESTRICTIVE policy scoped to `resumes`.
- **`i18n`** over-converted 台 to 臺 in `平台` and `後台`. Taiwan tech and UI writing uses 平台 and 後台; 臺 belongs in official spellings such as 臺灣. Reverted.
