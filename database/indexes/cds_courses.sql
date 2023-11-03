create index cds_courses_name_zh ON cds_courses USING pgroonga(name_zh);
create index cds_courses_teacher_zh ON cds_courses USING pgroonga(teacher_zh);
create index cds_courses_venues ON cds_courses USING pgroonga(venues);
create index cds_courses_name_en ON cds_courses USING pgroonga(name_en);
create index cds_courses_department ON cds_courses USING pgroonga(department);
create index cds_courses_course ON cds_courses USING pgroonga(course);
create index cds_courses_raw_id ON cds_courses USING pgroonga(raw_id);

CREATE OR REPLACE FUNCTION search_cds_courses(keyword text)
RETURNS SETOF cds_courses AS
$func$
BEGIN
  IF trim(keyword) = '' THEN
    -- Keyword is blank, return all courses
    RETURN QUERY SELECT * FROM cds_courses;
  ELSE
    -- Keyword is not blank, perform the search
    RETURN QUERY SELECT * FROM cds_courses
      WHERE name_zh &@~ keyword
         OR teacher_zh &@~ keyword
         OR venues &@~ keyword
         OR name_en &@~ keyword
         OR raw_id &@ keyword;
  END IF;
END
$func$
LANGUAGE plpgsql;