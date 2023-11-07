CREATE OR REPLACE VIEW courses_with_syllabus AS
SELECT
  c.*,
  cs.brief,
  cs.keywords
FROM courses c
LEFT JOIN course_syllabus cs ON c.raw_id = cs.raw_id;
