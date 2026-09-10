# Recruitment page implementation report

## Changed files

- `services/api/src/recruit.ts`: Added public roles, authenticated application status, rate-limited application submission, and authenticated direct multipart resume upload.
- `services/api/src/index.ts`: Registered the Worker route at `/recruit`.
- `services/api/migrations/20260910_120000_create_recruitment.sql`: Added the private applications table, RLS/grants, private `resumes` bucket, and service-role-only storage policy.
- `services/api/src/types/supabase.ts`: Hand-edited generated Supabase types for `recruitment_applications`.
- `apps/web/src/app/[lang]/(mods-pages)/(side-pages)/recruit/page.tsx`: Added the localized public recruitment page and authenticated application form.
- `apps/web/src/router.tsx`: Added the lazy `/recruit` route and SEO metadata.
- `apps/web/src/components/Footer.tsx`: Added the recruitment link.
- `apps/web/src/app/[lang]/(mods-pages)/(side-pages)/team/page.tsx`: Added a link from the team page to recruitment.
- `apps/web/src/dictionaries/en.json`: Added English recruitment, status, error, privacy, and cross-link strings.
- `apps/web/src/dictionaries/zh.json`: Added matching Taiwan Traditional Chinese strings.

## Backend and storage contract

The open roles are served from a committed constant in `services/api/src/recruit.ts`. Role IDs are stable API values and their localized titles/descriptions live in both web dictionaries, so the public page does not depend on a database just to render recruitment copy.

The upload flow is a direct authenticated multipart proxy:

1. The browser sends `POST /recruit/resume-upload` with `Authorization: Bearer <OIDC access token>` and a `file` form field.
2. The Worker uses the existing `auth()` middleware and `VENUE_RATE_LIMITER` helper, limits the file to 5 MiB, reads the bytes, and requires the `%PDF-` magic header. The client-side checks are only an early UX check; the Worker checks are authoritative.
3. The Worker writes through the Supabase service-role client to the private `resumes` bucket at `applicants/<URL-encoded-sub>.pdf`, with `upsert: true`. The original filename is never used as an object path, and the stable path gives each applicant one active resume object.
4. The browser sends `POST /recruit/apply` with the written application. The Worker verifies that the applicant has an uploaded object, stores the authenticated `sub`, and rejects duplicate applications with a unique database constraint and `409 ALREADY_APPLIED`.
5. `GET /recruit/application` returns only the authenticated applicant's status fields. There is no anonymous application or resume read endpoint.

This is safe with the public Supabase anon key in the web bundle because the browser never uploads to Supabase and never receives a signed or public resume URL. All resume writes and reads used by the Worker go through the service-role key; the bucket is private and a RESTRICTIVE storage policy denies anon and authenticated any access to the `resumes` bucket regardless of other permissive policies.

Bucket: `resumes`, private (`public = false`). The migration's storage policy is `Recruitment resumes are service role only`: `anon` and `authenticated` have `USING (false)` and `WITH CHECK (false)`. The service role bypasses those policies. The applications table has RLS enabled, no select policy, and all table privileges revoked from `anon` and `authenticated`.

## Migration SQL

```sql
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

revoke all on table public.recruitment_applications from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

drop policy if exists "Recruitment resumes are service role only" on storage.objects;
create policy "Recruitment resumes are service role only"
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id <> 'resumes')
  with check (bucket_id <> 'resumes');
```

## Maintainer steps

1. Apply `services/api/migrations/20260910_120000_create_recruitment.sql` to the production Supabase project. It creates/verifies the private `resumes` bucket and its policy. If bucket creation is managed separately, create a bucket named exactly `resumes` with Public bucket disabled and apply the same service-role-only policy before enabling the page.
2. Confirm the existing API Worker secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. No new environment variable is required.
3. No new rate-limit namespace is required: the route reuses the existing `VENUE_RATE_LIMITER` binding. If that binding is absent in an environment, the existing helper logs and allows the request, so production must retain the current binding rather than adding an unverified namespace ID.
4. Rebuild the generated Hono client types with `bun run build:api-types` before consuming the new route through `@courseweb/api-types`. The source route is included in the API app type only after that rebuild. The aggregate command was attempted here but exited on existing `TS2742` declaration-portability errors in `services/api/src/config/algolia.ts`; it also ran the existing Prisma-generation dependency as part of the attempt. No lockfile or tracked generated source file was intentionally edited. The page uses authenticated API `fetch` calls so multipart upload does not depend on client-side form encoding support.
5. Deploy the API Worker and web app through the normal maintainer release process after the migration and secrets are verified.

The existing privacy policy should be updated by the maintainer to explicitly cover recruitment applications, resumes, authorized reviewers, retention, and deletion requests. This task adds the form notice and privacy-policy link but intentionally does not rewrite the policy.

The Supabase type files were not regenerated with `gentype` because that command requires network access and credentials. The API generated type was hand-edited as requested; the web app does not query this table directly, so `apps/web/src/types/supabase.ts` did not need a change.

## Validation

- Before changes, `cd apps/web && bunx tsc --noEmit` reported exactly 8 errors, matching the supplied baseline.
- Final `cd apps/web && bunx tsc --noEmit` reports exactly 8 errors, all in the pre-existing shops/forms/worker locations; no recruitment-page error was added.
- Before the generated Prisma client was present, `cd services/api && bunx tsc --noEmit` reported 10 pre-existing errors. Final `bunx tsc --noEmit` reports 0 after the existing Prisma generation step ran; the new route introduces no API type errors.
- English and Chinese dictionary JSON parsed successfully and their key trees match (760 keys).
- `git diff --check` passed.
- No dev server, live upload, Supabase migration, or production deployment was run.

## Deliberately not included

- No admin dashboard or status-management endpoint was added. Reviewers can use the stored status column for the existing operational workflow; exposing applicant data through a new admin surface would require a separate authorization/design review.
- No resume download endpoint was added. Resumes remain service-role-only; a future reviewer workflow must mint a short-lived signed URL or proxy the file after authorization.
- No deletion endpoint was added. The form gives the deletion contact address, and the privacy-policy update/retention workflow needs maintainer policy decisions.
- No new dependencies, lockfile changes, protected component changes, commits, pushes, or generated Supabase type runs were made.


## Manager review note (2026-09-10)

The originally submitted storage policy was PERMISSIVE with `USING (false)`. Permissive
policies are OR-ed, so it granted nothing but also forbade nothing: any other permissive
policy on `storage.objects` would still have exposed the bucket. It was also unscoped,
applying to every bucket rather than `resumes`. Replaced with a RESTRICTIVE, bucket-scoped
policy. The report text above was corrected to match.
