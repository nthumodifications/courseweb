# Sonar services report

Date: 2026-10-06

Scope: `services/api/` and `services/secure-api/`. The changes are left uncommitted as requested. `SONAR_ISSUES.tsv` was preserved.

## Verification

The baseline was recorded before editing. Counts below are command output counts, not a SonarCloud rescan.

| Workspace             | Command                              |                          Baseline |                             Final |
| --------------------- | ------------------------------------ | --------------------------------: | --------------------------------: |
| `services/api`        | `bunx tsc --noEmit -p tsconfig.json` |                  exit 0, 0 errors |                  exit 0, 0 errors |
| `services/secure-api` | `bunx tsc --noEmit -p tsconfig.json` |                 exit 1, 21 errors |                 exit 1, 21 errors |
| `services/api`        | `bun test src`                       | 175 passed, 0 failed, 576 expects | 180 passed, 0 failed, 606 expects |
| `services/secure-api` | `bun test`                           |  99 passed, 0 failed, 264 expects | 101 passed, 0 failed, 267 expects |

The 21 secure-api type errors are unchanged, pre-existing diagnostics involving the junctioned/generated Prisma client and unrelated admin/auth files. One existing implicit-any diagnostic in `src/oidc.tsx` moved with surrounding code; no new diagnostic was introduced in the edited logic.

I also ran `bunx eslint` on every changed file in each owning workspace. Both runs were inconclusive before file analysis because the shared config could not resolve `@typescript-eslint/recommended`:

```
ESLint couldn't find the config "@typescript-eslint/recommended" to extend from.
```

This is a dependency/configuration limitation in the current junctioned checkout, not a passing lint result. `git diff --check` completed without whitespace errors; Git emitted only expected LF-to-CRLF working-tree warnings.

## Rule disposition

“Fixed” means the TSV finding was addressed in the source; SonarCloud was not available for a post-change rescan. Deferred items were left unchanged because the safe behavior-preserving refactor was not clear or would require work outside the requested scope.

| Rule                           | Fixed | Deferred | Judged false-positive / intentional |
| ------------------------------ | ----: | -------: | ----------------------------------: |
| `css:S1874`                    |     0 |        1 |                                   0 |
| `docker:S6505`                 |     1 |        0 |                                   0 |
| `docker:S6597`                 |     3 |        0 |                                   0 |
| `javascript:S6582`             |     1 |        0 |                                   0 |
| `javascript:S6660`             |     1 |        0 |                                   0 |
| `javascript:S6836`             |     1 |        0 |                                   0 |
| `javascript:S7772`             |     3 |        0 |                                   0 |
| `plsql:NamingTypesCheck`       |     0 |        1 |                                   0 |
| `plsql:QuotedIdentifiersCheck` |     0 |        1 |                                   0 |
| `shelldre:S7682`               |    11 |        0 |                                   0 |
| `shelldre:S7688`               |     2 |        0 |                                   0 |
| `tssecurity:S5131`             |     1 |        0 |                                   0 |
| `tssecurity:S5145`             |     3 |        0 |                                   0 |
| `tssecurity:S5146`             |     2 |        0 |                                   0 |
| `tssecurity:S7044`             |     2 |        0 |                                   0 |
| `typescript:S1128`             |     4 |        0 |                                   0 |
| `typescript:S1135`             |     0 |        3 |                                   0 |
| `typescript:S1854`             |    10 |        0 |                                   0 |
| `typescript:S1871`             |     0 |        1 |                                   0 |
| `typescript:S2004`             |     0 |        2 |                                   0 |
| `typescript:S2187`             |     1 |        0 |                                   0 |
| `typescript:S2245`             |     0 |        0 |                                   1 |
| `typescript:S2486`             |     0 |        0 |                                   4 |
| `typescript:S2699`             |     1 |        0 |                                   0 |
| `typescript:S3358`             |    12 |        1 |                                   0 |
| `typescript:S3776`             |     0 |       27 |                                   0 |
| `typescript:S3863`             |     2 |        0 |                                   0 |
| `typescript:S4043`             |     2 |        0 |                                   0 |
| `typescript:S4138`             |     2 |        0 |                                   0 |
| `typescript:S4323`             |     1 |        0 |                                   0 |
| `typescript:S4624`             |     3 |        0 |                                   0 |
| `typescript:S4790`             |     0 |        0 |                                   1 |
| `typescript:S5843`             |     0 |        3 |                                   0 |
| `typescript:S5869`             |     1 |        0 |                                   0 |
| `typescript:S5906`             |    23 |        0 |                                   0 |
| `typescript:S5976`             |     0 |        1 |                                   0 |
| `typescript:S6035`             |     1 |        0 |                                   0 |
| `typescript:S6353`             |     2 |        0 |                                   0 |
| `typescript:S6522`             |     0 |        1 |                                   0 |
| `typescript:S6551`             |     0 |        1 |                                   0 |
| `typescript:S6564`             |     0 |       10 |                                   0 |
| `typescript:S6571`             |     0 |        2 |                                   0 |
| `typescript:S6582`             |     7 |        1 |                                   0 |
| `typescript:S6594`             |     0 |       19 |                                   0 |
| `typescript:S6653`             |     2 |        0 |                                   0 |
| `typescript:S6836`             |     1 |        0 |                                   0 |
| `typescript:S7503`             |     1 |       15 |                                   0 |
| `typescript:S7723`             |     7 |        0 |                                   0 |
| `typescript:S7727`             |     1 |        0 |                                   0 |
| `typescript:S7752`             |     1 |        0 |                                   0 |
| `typescript:S7753`             |     1 |        0 |                                   0 |
| `typescript:S7754`             |     1 |        0 |                                   0 |
| `typescript:S7755`             |     6 |        0 |                                   0 |
| `typescript:S7758`             |     7 |        0 |                                   0 |
| `typescript:S7766`             |     1 |        0 |                                   0 |
| `typescript:S7772`             |     2 |        0 |                                   0 |
| `typescript:S7773`             |    20 |        0 |                                   0 |
| `typescript:S7776`             |     3 |        0 |                                   0 |
| `typescript:S7778`             |     0 |        2 |                                   0 |
| `typescript:S7780`             |    11 |        0 |                                   0 |
| `typescript:S7781`             |    18 |        0 |                                   0 |
| `typescript:S7786`             |     2 |        0 |                                   0 |
| `typescript:S8786`             |     0 |       18 |                                   0 |
| `typescript:S9381`             |     0 |        2 |                                   0 |
| `typescript:S9382`             |     0 |       22 |                                   0 |
| `typescript:S9383`             |     1 |        0 |                                   0 |

The mechanical fixes include safe modern built-ins, import cleanup, shell quoting/exit status corrections, switch-case scoping, dead-assignment removal, test assertions, and small equivalent control-flow extractions. Exported redundant aliases were intentionally retained because removing them could be an export/API change.

The CSS finding is in generated `output.css`; the two PL/SQL findings are in an existing/applied migration and were explicitly treated as will-not-fix. TODOs, large cognitive-complexity functions, nested promise callbacks, generated Supabase types, regex modernization, and other non-obvious refactors are deferred. Array-index React keys were not changed where no stable item identifier was available.

The `Math.random` finding is intentional jitter for retry backoff, not token/key generation. The SHA-1 finding is a deterministic shortlink KV-key derivation and is not used for authentication, integrity, or password handling. The broad catch findings intentionally convert upstream/auth/OIDC failures to generic protocol responses; they do not suppress a required recovery path or expose the caught value.

## Vulnerability, hotspot, and bug fixes

### `services/api/src/shortlink-redirect.ts` — open redirect

The old validation accepted any absolute `http:` or `https:` URL stored in KV, so a compromised or incorrectly populated shortlink could redirect users to an attacker-controlled origin. Redirect targets now must parse as HTTPS and have the exact registered origin `https://nthumods.com`; invalid or external targets return HTTP 400. The redirect uses the normalized validated URL. The related KV API key is also URI-encoded.

Exercise with `bun test src/shortlink-redirect.test.ts` from `services/api`. The test covers a trusted `https://nthumods.com/...` target returning 302 and an external target returning 400.

### `services/api/src/calendar-proxy.ts` — reflected XSS / unsafe proxied calendar response

The proxy previously returned upstream text as a downloadable response without checking that it was actually iCalendar data, and included request-derived data in `Content-Disposition`. An upstream HTML response could therefore be delivered under a calendar endpoint. The proxy now uses an encoded user path segment, requires `text/calendar`, requires a `VCALENDAR` envelope, rejects HTML-like tags, uses a constant quoted filename, and sends `Content-Security-Policy: default-src 'none'` plus `X-Content-Type-Options: nosniff`. Raw upstream error bodies are no longer logged.

Exercise with `bun test src/calendar-proxy.test.ts` from `services/api`. The tests cover a valid calendar response and both an HTML content type and markup embedded in a calendar-shaped body.

### `services/secure-api/src/oidc.tsx` — logout open redirect

The logout route did check membership in the client’s registered logout URI list, but then concatenated the untrusted request value with `?state=` and passed the result directly to `c.redirect`. Redirect construction now first retrieves the exact matching registered URI, then uses the existing URL-parameter builder to encode `state`. This preserves legitimate registered-client flows while preventing query-string injection or redirecting to a value that was not registered.

Exercise with `bun test src/utils/consent.test.ts src/__tests__/index.test.ts` from `services/secure-api`. The focused tests verify exact registered-URI selection and URL encoding in the client redirect helper. A full live OIDC-provider flow was not run.

### Other vulnerability, hotspot, and bug rows

- `tssecurity:S7044` in `calendar-proxy.ts`: the upstream secure-api path now encodes `userId` as one URL path segment. The same rule in `shortlink.ts` is addressed by encoding the KV key before constructing the Cloudflare API URL.
- `tssecurity:S5145` in `calendar-proxy.ts` and twice in `issue.ts`: upstream response bodies are no longer interpolated into logs. Logs retain fixed context and numeric status values only.
- `docker:S6505`: the secure-api dependency layer now uses `bun install --frozen-lockfile --ignore-scripts`, preventing package lifecycle scripts from running during the image build.
- `typescript:S7727`: the chat course-summary map now uses an explicit callback, avoiding the flagged direct method reference while preserving the mapping.
- `typescript:S9383`: the syllabus PDF download is awaited so the scraper does not finish before that work has settled.
- `typescript:S2245` is intentional: `Math.random()` supplies non-security retry-backoff jitter only; it does not generate credentials, tokens, or authorization values.
- `typescript:S4790` is intentional: SHA-1 is used only to derive a deterministic shortlink KV key. It is not used for authentication, password storage, signatures, integrity verification, or secrecy.

## Other scope work

The remaining in-scope fixes are behavior-preserving maintainability changes from the TSV: numeric parsing and NaN checks, optional chaining, `replaceAll`, `RegExp.exec`/regex literal cleanup where equivalent, `Object.hasOwn`, `.at`, `String.raw`, explicit promise/callback returns, safer switch scoping, unused/dead code removal, shell test exit propagation, and missing test assertions. The secure-api Dockerfile was adjusted to use the lockfile-preserving install form and explicit working-directory steps; no install was run.

## Out of scope and uncertainties

- No files outside `services/api/` and `services/secure-api/` were edited except this requested report. Web code, dictionaries, package manifests, lockfiles, schemas, existing migrations, generated output, and junctioned `node_modules`/Prisma output were left alone.
- No dependency installation, Prisma generation, deployment, commit, push, stash, branch switch, or `gh` command was used.
- SonarCloud was not rescanned, so the disposition table is source-based and should be confirmed by the next analysis.
- The secure-api typecheck remains blocked by the same 21 pre-existing Prisma/admin diagnostics. ESLint remains unverified because the shared `@typescript-eslint/recommended` config is unavailable in this checkout.
- No browser test, production endpoint test, or live OIDC-provider integration test was performed. The calendar validation intentionally rejects HTML-like markup in upstream data; if the upstream service relies on HTML in an iCalendar extension, that contract should be reviewed before deployment.
