-- Manifest soundness relies on the scraper's code-level contract: it is
-- upsert-only and unconditionally bumps courses.updated_at. This is not
-- enforced by the database, so keep that scraper behavior intact.
CREATE OR REPLACE FUNCTION search_manifest(p_semester text DEFAULT NULL)
RETURNS TABLE(
  semester text,
  row_count bigint,
  max_updated_at timestamptz
)
AS $func$
  SELECT
    c.semester,
    count(*)::bigint AS row_count,
    max(c.updated_at) AS max_updated_at
  FROM courses AS c
  WHERE p_semester IS NULL OR c.semester = p_semester
  GROUP BY c.semester
  ORDER BY c.semester;
$func$
LANGUAGE sql
STABLE;
