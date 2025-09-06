create index courses_name_zh ON courses USING pgroonga(name_zh);
create index courses_teacher_zh ON courses USING pgroonga(teacher_zh);
create index courses_name_en ON courses USING pgroonga(name_en);
create index courses_teacher_en ON courses USING pgroonga(teacher_en);
create index courses_department ON courses USING pgroonga(department);
create index courses_course ON courses USING pgroonga(course);
create index courses_raw_id ON courses USING pgroonga(raw_id);
create index courses_keywords ON course_syllabus USING pgroonga(keywords);

CREATE OR REPLACE FUNCTION search_courses(keyword text)
RETURNS SETOF courses AS
$func$
BEGIN
  IF trim(keyword) = '' THEN
    -- Keyword is blank, return all courses
    RETURN QUERY SELECT * FROM courses;
  ELSE
    -- Keyword is not blank, perform the search
    RETURN QUERY SELECT * FROM courses
      WHERE name_zh &@~ keyword
         OR teacher_zh &@~ keyword
         OR name_en &@~ keyword
         OR teacher_en &@~ keyword
         OR raw_id &@ keyword;
  END IF;
END
$func$
LANGUAGE plpgsql;

DROP FUNCTION search_courses_with_syllabus;

CREATE OR REPLACE FUNCTION search_courses_with_syllabus(keyword text)
RETURNS TABLE(
    raw_id text,
    semester text,
    department text,
    course text,
    class text,
    name_en text,
    name_zh text,
    credits real ,
    capacity bigint,
    reserve bigint,
    language text,
    ge_target text,
    ge_type text,
    note text,
    closed_mark text,
    prerequisites text,
    restrictions text,
    no_extra_selection boolean,
    cross_discipline text[],
    teacher_en text[],
    teacher_zh text[],
    first_specialization text[],
    second_specialization text[],
    times text[],
    compulsory_for text[],
    elective_for text[],
    tags text[],
    venues text[],
    time_slots text[],
    brief text,
    keywords text[]
  ) AS
$func$
BEGIN
  IF trim(keyword) = '' THEN
    -- Keyword is blank, return all courses
    RETURN QUERY SELECT 
        c.*,
        split_times(c.times) as time_slots,
        cs.brief,
        cs.keywords
      FROM courses c
      LEFT JOIN course_syllabus cs ON c.raw_id = cs.raw_id;
  ELSE
    -- Keyword is not blank, perform the search
    RETURN QUERY SELECT
        c.*,
        split_times(c.times) as time_slots,
        cs.brief,
        cs.keywords
      FROM courses c
      LEFT JOIN course_syllabus cs ON c.raw_id = cs.raw_id
      WHERE c.name_zh &@~ keyword
         OR c.teacher_zh &@~ keyword
         OR c.name_en &@~ keyword
         OR c.teacher_en &@~ keyword
         OR c.raw_id &@ keyword;
  END IF;
END
$func$
LANGUAGE plpgsql;