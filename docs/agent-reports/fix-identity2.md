# identity2: synced timetable identity and rate-limit fixes

## 1. Changes by file

- `apps/web/src/hooks/syncedStorage.ts`: added the RxDB-aligned anonymous/subject namespace functions, recoverable legacy-record migration, and pure synced-data reconciliation logic.
- `apps/web/src/hooks/useSyncedStorage.tsx`: changed local persistence to identity-scoped keys, blocked stale snapshots during identity transitions, and kept anonymous data separate from authenticated sign-in.
- `apps/web/src/hooks/syncedStorage.test.ts`: added A-logout/B-login, existing/missing remote, anonymous sign-in, namespace, and legacy-preservation regression tests.
- `apps/web/src/components/Header.tsx`: made “clear local data” remove the current account namespace, anonymous namespace, and legacy unscoped copies while retaining other account namespaces.
- `services/secure-api/src/api/kv_storage.ts`: consumed the pure KV contract so the custom timetable key is accepted and its values use ID-based merge behavior.
- `services/secure-api/src/api/kv_storage_contract.ts`: registered `timetable_custom_items` and implemented the server-side ID merge with incoming values winning edits.
- `services/secure-api/src/api/kv_storage.test.ts`: added isolated contract tests for the allowlist and custom-item merge.
- `services/api/src/utils/rate-limit.ts`: changed `userIdKeyGenerator` to prefer the authenticated `c.get("user").sub` and ignore spoofable identity query/header values.

## 2. Findings fixed and verification

### Finding 3: synced timetable data was shared between accounts

Each key now uses:

- anonymous: `nthumods-storage-anonymous-<key>`;
- authenticated: `nthumods-storage-<16-hex-subject-hash>-<key>`.

The authenticated hash is the same two-FNV-style hash derivation used by the existing RxDB calendar identity scheme. The subject is not stored in the browser key. React Query remains keyed by subject, and the local record now uses the same subject namespace. During a subject transition, the hook temporarily returns the default value and refuses reconciliation/update calls until `useLocalStorage` has loaded the new namespace. This prevents a cached A snapshot from being uploaded for B.

The anonymous policy is non-adoption: anonymous timetable data remains in the anonymous namespace and is not merged into the first account that signs in. This matches the calendar’s shared-machine safety decision. Timetable data is less sensitive than calendar events, but attributing a shared machine’s anonymous timetable to the next account is still surprising and avoidable; retaining it anonymously means the data is not silently destroyed.

The old unscoped record is migrated only into the explicit anonymous namespace when that namespace has no record. The original unscoped key is retained as a recoverable legacy copy. An authenticated account never uses that legacy value as its local merge input. If the user explicitly chooses “clear local data” at logout, the header removes the current account namespace, anonymous namespace, and legacy copy; other subject namespaces are retained.

The pure regression tests trace these concrete cases:

- A has `{"11410":["course-a"]}`, B has no local or remote record: B resolves to `{}` and has no upload request; A’s namespaced snapshot remains unchanged.
- A has `course-a`, B’s remote record has `course-b`: B resolves to only `course-b`; no A/B union or upload occurs.
- anonymous has `anonymous-course`, B signs in with no record: B resolves to `{}` and the anonymous snapshot remains intact.
- an old `courses` wrapper is copied to the namespaced anonymous key while the original `courses` value remains byte-for-byte present.

These cases are covered by `apps/web/src/hooks/syncedStorage.test.ts` (10 passing tests). No authenticated browser shared-machine transition or live remote KV call was available, so the runtime hook transition itself is source-traced rather than browser-observed.

### Finding 2: custom activities never reached authenticated KV storage

`timetable_custom_items` is now in the secure-api allowlist. Its merge path groups items by semester and ID, preserves IDs from both snapshots, and lets incoming values replace an existing item with the same ID. This is the same ID-based policy as the web helper and is not last-write-wins.

The service has no reusable KV route test harness. A temporary mock-based route test contaminated the existing auth tests because Bun shares module mocks across test files, so it was removed. The isolated contract test verifies the actual allowlist and merge helper consumed by `kv_storage.ts`: 2 tests pass. Secure-api typechecking and the full secure-api suite also pass. Direct authenticated GET/POST/reload behavior remains untested at the HTTP harness level.

### Finding 12: recruitment rate limiting accepted spoofable identity headers

`userIdKeyGenerator` now returns the authenticated subject from `c.get("user")?.sub`; only when no authenticated subject exists does it fall back to the existing IP generator. `userId` query parameters and `x-user-id` headers are ignored whenever auth has populated the subject.

Repository search found one caller: the two authenticated recruitment POST routes in `services/api/src/recruit.ts` (`/resume-upload` and `/apply`) share `applicationRateLimit`, and both run `auth()` before it. The venue limiter uses `ipWithPathKeyGenerator` and is unaffected. A direct Hono trace with subject `authenticated-subject`, `?userId=spoofed`, and `x-user-id: also-spoofed` returned `authenticated-subject`.

## 3. Deliberately not changed

- `apps/web/src/hooks/contexts/useUserTimetable.tsx` did not need a call-site change: all of its existing `useSyncedStorage` keys automatically receive the new namespace behavior, including `timetable_custom_items`.
- No files under `components/Calendar/`, `components/Timetable/`, `hooks/useUpcomingEvents.ts`, `helpers/dates.ts`, or `config/rxdb.tsx` were touched.
- No anonymous-to-account adoption was implemented, for the shared-machine reason above.
- No new environment variable, package, lockfile, database schema, or server migration was added.
- No live deployment, authenticated browser test, Firestore test, or Cloudflare rate-limiter integration test was run.

## 4. Migration and maintainer steps

- No database migration or environment change is required.
- On the first anonymous hook initialization after deployment, each present legacy unscoped record is copied into its explicit anonymous key; the old key remains until the user explicitly clears local data.
- Existing authenticated users receive a new subject-scoped local namespace. Their remote KV record remains authoritative; old unscoped browser data is not silently attributed to that account.
- Deploy the secure-api and API source through the normal maintainer deployment process so the new KV allowlist/merge and rate-limit behavior are active server-side. No special migration command is needed.

## 5. Verification totals

- `cd apps/web && bunx tsc --noEmit`: exit 1 with exactly 8 established errors, all pre-existing in `shops/page.tsx`, `GenericIssueFormDialog.tsx` (3), `IssueFormDialog.tsx` (3), and `worker.ts`.
- `cd apps/web && bun test src`: 51 pass, 0 fail, 103 assertions.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts`: 10 pass, 0 fail, 22 assertions.
- `cd apps/web && bun test src/features/campusMap`: 9 pass, 0 fail, 23 assertions.
- `cd apps/web && bunx vite build`: passed; 6,411 modules transformed.
- `cd services/api && bunx tsc --noEmit`: 0 errors.
- `cd services/api && bun test`: 96 pass, 0 fail, 178 assertions.
- `cd services/secure-api && bunx tsc --noEmit`: 0 errors.
- `cd services/secure-api && bun test`: 46 pass, 0 fail, 160 assertions.
- `cd services/secure-api && bun test src/api/kv_storage.test.ts`: 2 pass, 0 fail, 2 assertions.
- Prettier check on all changed source/test files: passed.
- `git diff --check`: passed.

## 6. Remaining untested or broken

- The account A logout/keep-local → account B login flow is covered by pure namespace/reconciliation tests, not an authenticated browser session.
- KV allowlist/merge behavior is contract-tested, but there is no isolated service route harness proving real authenticated HTTP GET/POST/reload behavior.
- Rate-limit key selection is smoke-tested directly; no live Cloudflare limiter or recruitment upload request was exercised.
- The pre-existing `timetable-display-settings` caller still uses `useSyncedStorage` while its hyphenated key is not in the secure-api allowlist. It was outside findings 2, 3, and 12 and was deliberately not expanded into this fix.
