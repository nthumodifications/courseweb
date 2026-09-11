ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_label text,
  ADD COLUMN IF NOT EXISTS link_label_en text,
  ADD COLUMN IF NOT EXISTS dismissible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- RLS is already enabled on public.alerts in the live database, and the table
-- already carries a PERMISSIVE policy "Enable read access for all users" with
-- USING (true). Permissive policies are OR-ed, so ADDING a second policy that
-- says "only active rows" would grant nothing and forbid nothing: every row,
-- including an unpublished draft, would stay world-readable.
--
-- Narrow the existing policy in place instead of adding a redundant one. Every
-- current row gets active = true from the column default, so this changes no
-- visible behaviour today; it only keeps a future draft (active = false) out of
-- the public API until a maintainer publishes it.
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

ALTER POLICY "Enable read access for all users"
  ON public.alerts
  USING (active IS TRUE);
