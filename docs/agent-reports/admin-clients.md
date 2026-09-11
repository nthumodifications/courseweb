# Admin OAuth clients

Built the superuser-only OAuth clients page for the admin center. It lists client metadata, scopes, consent counts, expandable redirect/logout URI details, and guarded edit, rotate-secret, and delete actions. Create and edit dialogs support repeatable URI fields, the seven server-approved scopes, client ID/URL/scope validation, and first-party/confidential settings. Secret creation and rotation show the returned secret once with a copy action and an explicit no-recovery warning.

Files touched:

- `apps/web/src/app/[lang]/admin/clients/page.tsx`
- `apps/web/src/app/[lang]/admin/api.ts`
- `docs/agent-reports/admin-clients.md`

Verification:

- Command: `cd apps/web && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep admin`
  Output: no output.
- Command: `bunx prettier --check 'apps/web/src/app/[lang]/admin/clients/page.tsx' 'apps/web/src/app/[lang]/admin/api.ts'`
  Output: `Checking formatting...` followed by `All matched files use Prettier code style!`
- `git diff --check` passed.

Nothing else was changed, committed, or pushed. I did not run a browser or live API integration test.
