# Admin audit log

## Built

Implemented the staff audit log page with:

- URL-backed action, actor ID, and page filters.
- Debounced action searching and action-prefix shortcuts for `user.`,
  `announcement.`, `client.`, and all actions.
- Responsive paginated audit table with Taipei timestamps, relative times,
  actor and user-target links, and destructive action badges.
- Readable role-change, ban-reason, session-revoke, announcement, and client
  metadata summaries, with expandable compact JSON for other metadata.

## Files touched

- `apps/web/src/app/[lang]/admin/audit/page.tsx`
- `docs/agent-reports/admin-audit.md`

## Verification

Command:

```text
cd apps/web && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep admin
```

Output: empty. The pipeline returned exit code 1 because `grep` found no
matching `admin` diagnostics.

Command:

```text
bunx prettier --check apps/web/src/app/[lang]/admin/audit/page.tsx docs/agent-reports/admin-audit.md
```

Output:

```text
Checking formatting...
All matched files use Prettier code style!
```

## Could not do

Nothing blocking the requested implementation.
