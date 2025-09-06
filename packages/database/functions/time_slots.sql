-- we now split in the prev function alr. so this is not needed anymore
-- create function time_slots(_courses_with_syllabus) returns text[] as $$
--   select split_times($1.times);
-- $$ language sql immutable;

create function cds_time_slots(cds_courses) returns text[] as $$
  select split_times($1.times);
$$ language sql immutable;
