-- Run each CREATE INDEX CONCURRENTLY statement outside a transaction.
-- These indexes keep the scalar PostgREST ilike branches responsive on the
-- 57k-row courses table.
create extension if not exists pg_trgm;

create index concurrently if not exists courses_name_zh_trgm
  on courses using gin (name_zh gin_trgm_ops);

create index concurrently if not exists courses_name_en_trgm
  on courses using gin (name_en gin_trgm_ops);

create index concurrently if not exists courses_raw_id_trgm
  on courses using gin (raw_id gin_trgm_ops);

create index concurrently if not exists courses_course_trgm
  on courses using gin (course gin_trgm_ops);

create index concurrently if not exists courses_department_trgm
  on courses using gin (department gin_trgm_ops);

-- teacher_zh and teacher_en are text[] columns. Index their searchable text
-- representation rather than applying gin_trgm_ops directly to an array.
create index concurrently if not exists courses_teacher_zh_trgm
  on courses using gin ((array_to_string(teacher_zh, ' ')) gin_trgm_ops);

create index concurrently if not exists courses_teacher_en_trgm
  on courses using gin ((array_to_string(teacher_en, ' ')) gin_trgm_ops);
