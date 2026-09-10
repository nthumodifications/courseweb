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
