-- Used by the frontend module page: one equality query for a department/course pair.
create index if not exists courses_module_key on courses using btree (department, course);
