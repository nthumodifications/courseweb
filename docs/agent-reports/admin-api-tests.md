# Admin API tests

Added Bun coverage for the admin authorization middleware, user management API,
and announcement validation. The tests cover role ranking and access gates,
self-protection and bootstrap-superuser safeguards, administrator ban
permissions, token/session revocation, unban reason clearing, user search and
pagination, safe announcement links, and date ordering. The existing auth test
now also verifies that a valid token for a banned account receives
`account_suspended`.

Files touched:

- `services/secure-api/src/middleware/requireAdmin.test.ts` (new)
- `services/secure-api/src/api/admin/users.test.ts` (new)
- `services/secure-api/src/api/admin/announcements.test.ts` (new)
- `services/secure-api/src/middleware/requireAuth.test.ts` (appended one test)
- `docs/agent-reports/admin-api-tests.md` (this report)

Verification:

```text
Command: cd services/secure-api && bun test src/middleware src/api/admin
bun test v1.3.4 (5eb2145b)

 21 pass
 0 fail
 57 expect() calls
Ran 21 tests across 4 files. [255.00ms]
```

```text
Command: cd apps/web && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep admin
Output: (empty)
Pipeline exit status: 1 because grep found no matching lines.
```

```text
Command: cd services/secure-api && bunx prettier --check src/middleware/requireAdmin.test.ts src/api/admin/users.test.ts src/api/admin/announcements.test.ts src/middleware/requireAuth.test.ts ../../docs/agent-reports/admin-api-tests.md
Checking formatting...
All matched files use Prettier code style!
```

Could not do: nothing. No implementation files were changed, and no commit or
push was performed.
