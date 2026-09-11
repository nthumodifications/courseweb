create table if not exists public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_sub text not null unique,
  role text not null,
  statement text not null,
  contact_preference text not null,
  links jsonb not null default '{}'::jsonb,
  resume_object_path text not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_applications_status_check
    check (status in ('submitted', 'reviewing', 'accepted', 'rejected'))
);

alter table public.recruitment_applications enable row level security;

-- Applications are private personal data. The Worker uses the service role,
-- which bypasses RLS; browser roles receive no table privileges or policies.
revoke all on table public.recruitment_applications from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

-- A PERMISSIVE policy with USING (false) grants nothing but also forbids
-- nothing: permissive policies are OR-ed, so any other permissive policy on
-- storage.objects would still expose this bucket. Use a RESTRICTIVE policy,
-- which is AND-ed with every other policy, and scope it to this bucket so it
-- does not affect any other bucket.
drop policy if exists "Recruitment resumes are service role only" on storage.objects;
create policy "Recruitment resumes are service role only"
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id <> 'resumes')
  with check (bucket_id <> 'resumes');
