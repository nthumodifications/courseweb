# Announcement bar report

## Changes

- `packages/database/migrations/20260910_120000_add_alert_announcement_fields.sql`: adds the announcement fields to the existing `public.alerts` table and adds an anonymous active-row RLS policy.
- `apps/web/src/types/supabase.ts`: hand-edits the generated `alerts` Row, Insert, and Update types for the new columns.
- `apps/web/src/components/Alerts/AnnouncementBar.tsx`: adds the cached, locale-aware, date-filtered, priority-ordered, dismissible announcement bar.
- `apps/web/src/layouts/MainLayout.tsx`: mounts `AnnouncementBar` immediately after the existing sticky `Header` and leaves `Header.tsx` unchanged.
- `apps/web/src/dictionaries/en.json`: adds the English dismiss-button label.
- `apps/web/src/dictionaries/zh.json`: adds the Traditional Chinese dismiss-button label.
- `REPORT.md`: records the migration SQL, publish example, RLS finding, verification, and limitations.

## Deliberately not changed

- `components/Header.tsx`, `router.tsx`, and all `Calendar`, `Timetable`, `Widgets`, and `Today` component files were left untouched as required.
- The existing hardcoded alert components were not duplicated or repurposed; the new bar reads the existing `alerts` table.
- No dependency, lockfile, environment variable, deployment, or database data was changed.
- `bun run --cwd apps/web gentype` was not run. The generated Supabase type file was hand-edited and should be regenerated after the migration is applied.

## Database migration and manual steps

Run this SQL in the Supabase SQL editor or the project’s migration process:

```sql
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_label text,
  ADD COLUMN IF NOT EXISTS link_label_en text,
  ADD COLUMN IF NOT EXISTS dismissible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- The repository does not declare RLS for its other public tables. This table
-- is intentionally protected because it is read with the public anon client.
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous users to read active alerts"
  ON public.alerts;

CREATE POLICY "Allow anonymous users to read active alerts"
  ON public.alerts
  FOR SELECT
  TO anon
  USING (active IS TRUE);
```

The repository search found no `CREATE POLICY`, `ENABLE ROW LEVEL SECURITY`, or other RLS policy statements for its public tables in `packages/database` or the checked-in SQL migrations. Therefore, there is no existing in-repo public-table RLS convention to follow. This migration intentionally establishes RLS specifically for `alerts` so the anonymous client can read active rows only; it does not claim that the other public tables are RLS-protected. The migration has not been applied or live-verified in this worktree.

After applying the migration, regenerate `apps/web/src/types/supabase.ts` using the project’s credentialed Supabase type-generation process. The checked-in file currently remains a deliberate hand-edit.

No new environment variable is required; the component uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configuration.

### Copy/paste publish example

This publishes a warning in Traditional Chinese with English fallback/copy, a link, dismissal enabled, and priority 10:

```sql
INSERT INTO public.alerts (
  title,
  description,
  severity,
  start_date,
  end_date,
  title_en,
  description_en,
  link_url,
  link_label,
  link_label_en,
  dismissible,
  active,
  priority
)
VALUES (
  '系統維護公告',
  '系統將於指定時間進行維護，服務可能暫時無法使用。',
  'warning',
  '2026-09-10T00:00:00Z',
  '2026-09-30T23:59:59Z',
  'Scheduled maintenance',
  'Services may be temporarily unavailable during the maintenance window.',
  'https://nthumods.com/',
  '查看詳情',
  'View details',
  true,
  true,
  10
);
```

## Verification

- `cd apps/web && bunx tsc --noEmit`: exit code 1 with exactly 8 diagnostics, matching the supplied baseline. No diagnostic points to this work.
- Dictionary JSON parsing and the added `alerts` key shape were checked for both locales.
- `git diff --check`: passed; only the expected line-ending warnings for existing modified text files were emitted.
- The migration was not executed against Supabase, and no browser/visual test or live anonymous RLS test was run.

## Remaining limitations

- The generated Supabase types will need regeneration after the database migration is applied.
- The bar’s live query, RLS behavior, and responsive one-line truncation were not browser-tested in this worktree.
- The typecheck still exits non-zero because of the eight pre-existing diagnostics documented in the task; no build or deployment was run.
