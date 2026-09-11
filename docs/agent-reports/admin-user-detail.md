# Admin user detail

## Built

- Replaced the user detail route placeholder with a responsive staff detail page.
- Added the bilingual account header, account metadata, role/status badges, and four summary stat cards.
- Added Sessions, Active tokens, API keys, Calendar share links, and Consented clients cards with responsive tables and explicit empty states.
- Added guarded role changes for superusers, including bootstrap-superuser and self-account explanations, confirmation, pending spinners, and success/error toasts.
- Added suspend/restore and sign-out-everywhere actions with AlertDialog confirmations, suspension reason input, immediate credential-deletion warning, pending spinners, and result toasts.
- Used the existing typed admin hooks and shared admin components; no raw fetch calls or route changes were made.

## Files touched

- `apps/web/src/app/[lang]/admin/users/[userId]/page.tsx`
- `docs/agent-reports/admin-user-detail.md`

## Verification

Command:

```text
cd apps/web && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep admin
```

Exact output: no output. The pipeline returned status 1 because `grep` found no admin diagnostics. The unfiltered compiler output contained only the known baseline errors in `shops/page.tsx`, `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, and `worker.ts`.

Command:

```text
bunx prettier --check 'apps/web/src/app/[lang]/admin/users/[userId]/page.tsx'
```

Output:

```text
Checking formatting...
All matched files use Prettier code style!
```

`git diff --check` passed for the page. No tests were run.

## Could not do

Nothing else was required or blocked.
