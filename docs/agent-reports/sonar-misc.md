# Sonar misc-scope report

Date: 2026-10-06
Branch: `chore/sonar-misc`

## Verification

The baseline was recorded before edits. Final counts are no worse than baseline.

| Workspace/check                 | Command                                        |         Baseline |            Final |
| ------------------------------- | ---------------------------------------------- | ---------------: | ---------------: |
| `packages/api-types` typecheck  | `bun run --cwd packages/api-types type-check`  |         0 errors |         0 errors |
| `packages/shared` typecheck     | `bun run --cwd packages/shared type-check`     |         0 errors |         0 errors |
| `packages/shared` tests         | `bun run --cwd packages/shared test`           | 13 pass / 0 fail | 13 pass / 0 fail |
| `packages/ui` typecheck         | `bun run --cwd packages/ui type-check`         |         0 errors |         0 errors |
| `tools/build-scripts` typecheck | `bun run --cwd tools/build-scripts type-check` |         0 errors |         0 errors |
| `tools/data-sync` typecheck     | `bun run --cwd tools/data-sync type-check`     |         0 errors |         0 errors |
| `tools/dict-manager` typecheck  | `bun run --cwd tools/dict-manager type-check`  |         0 errors |         0 errors |
| `tools/map-data` tests          | `bun run --cwd tools/map-data test`            | 24 pass / 0 fail | 24 pass / 0 fail |

`tools/map-data` has no `type-check` script and no `tsconfig.json`. The requested direct check, `bunx tsc --noEmit -p tools/map-data`, therefore fails with TS5057. An ad hoc compiler invocation over its source files reports two errors at unchanged existing code (`curation.ts:87` and `curation.ts:341`); the workspace test suite remains green.

Changed-file ESLint was attempted with `bunx eslint <changed files>` from each owning workspace. The package workspaces are inconclusive because the existing shared config cannot resolve `@typescript-eslint/recommended`. The map-data and artifact commands exit 0 but print the existing missing-pages-directory warning. No dependency installation was performed.

`git diff --check` passed. No package manifest, lockfile, dictionary, generated directory, `node_modules`, commit, push, or branch switch was performed. The Sonar issue inventory itself remains untracked as provided.

## Rule disposition

The inventory contains 252 rows. Based on source review and the changes below, 176 rows were fixed, 47 were deferred as higher-risk or intentionally sequential/complex, and 29 were judged false positives or intentional contracts.

| Disposition                          | Rules and rows                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed: security, bugs, and hotspots  | `githubactions:S7637` 9, `githubactions:S6505` 5, `githubactions:S8543` 5, `githubactions:S8234` 2, `githubactions:S7636` 1; `docker:S6505`/`S8543`/`S7018` 1 each; `tssecurity:S5145` 2; all 10 BUG rows; `shelldre:S7677` 1                                                                                                                                                                                                           |
| Fixed: mechanical                    | `javascript:S2681` 16, `S3358` 3, `S3923` 1, `S7723` 10, `S7772` 4, `S7781` 7; TypeScript `S1128` 10, `S1186` 1, `S1764` 5, `S1854` 6, `S2201` 1, `S3358` 5, `S3504` 2, `S4043` 2, `S4624` 1, `S6353` 3, `S6478` 2, `S6594` 5, `S6759` 2, `S7503` 1, `S7721` 1, `S7723` 2, `S7741` 1, `S7754` 4, `S7755` 3, `S7758` 4, `S7765` 1, `S7766` 1, `S7772` 4, `S7773` 25, `S7776` 2, `S7781` 1, `S7786` 6, `S878` 1, `S9383` 1; `css:S4649` 2 |
| Deferred                             | JavaScript `S107` 5, `S3776` 4, `S5843` 2, `S6035` 1, `S6535` 1, `S9382` 12; `plsql:S1192` 1; TypeScript `S2004` 1, `S3776` 3, `S6479` 1, `S6848` 1, `S8786` 7, `S9379` 1, `S9382` 7                                                                                                                                                                                                                                                    |
| Judged false-positive or intentional | `plsql:SelectStarCheck` 2; `typescript:S2245` 2, `S4036` 6, `S6564` 14, `S6571` 2, `S6747` 1, `S6850` 2                                                                                                                                                                                                                                                                                                                                 |

The `S6479` finding is deferred rather than suppressed: the rating stars have no stable item ID, so replacing the index key would be less correct than retaining it.

## Vulnerability, hotspot, and bug details

### Workflows and Docker

- All active third-party actions were pinned to verified tag commits. The verified references are `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` (`v4`), `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6` (`v2`), `cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd` (`v3`), and `docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9` (`v3`). Each SHA was checked with `git ls-remote` against the exact tag.
- Every active workflow install and the data-sync Docker install now uses `bun install --frozen-lockfile --ignore-scripts`. This prevents lifecycle scripts during installation and requires the checked-in lockfile. Docker was not built in this environment, so the partial-monorepo Docker build remains unverified.
- The two GHCR jobs now request only `contents: read` and `packages: write`, replacing `write-all`.
- Pull-request base/head SHAs, workflow-dispatch semester values, Docker image tags, and the Coolify token are passed through step `env` and consumed as quoted shell variables. This removes direct untrusted/context expansion in `run:` blocks without changing the operations.

Exercise: inspect the active `uses`, install, `permissions`, and `run` blocks in `.github/workflows/build.yaml` and `scrape.yaml`; on GitHub, run the existing pull-request, main-push, and workflow-dispatch paths. The GitHub-hosted paths were not executed locally.

### Data-sync logging and async bug

`retryWithBackoff` previously interpolated the caller identifier and error message directly into terminal logs. Both values can contain remote or external text. A control-character escaping helper now renders NUL/control characters as `\xNN` before logging, preventing line breaks and terminal-control injection while preserving ordinary messages.

`parseContent` previously called `downloadPDF` without awaiting it, allowing syllabus processing to return before the storage upload completed and hiding a rejection. The upload is now awaited. Exercise with a syllabus containing a PDF link and verify the storage upload completes before the course result is persisted.

The `Math.random()` uses in retry jitter and skeleton-width generation are not security randomness: one prevents synchronized retries and the other only varies a loading placeholder. The PATH findings in local build helpers likewise concern intentional inheritance of the trusted developer/CI executable path. These three hotspot groups were left as context-specific false positives.

### Bugs

- `packages/shared/src/constants/semester.ts` used `1 - 1` for January in five date literals. The value was intentionally January zero-based, so it is now written as `0`, preserving the dates while removing the identical-subexpression defect.
- `packages/shared/src/utils/timetable.ts` now assigns the result of the grouping `reduce` instead of relying on mutation and discarding the return value. Grouping behavior is unchanged.
- `artifacts/nthumods-course-tutorial/tutorial.js` had a conditional expression whose two branches were both `C.lilac`; it now directly uses `C.lilac`.
- The two motion-study HTML files now give their button font stacks a generic `sans-serif` fallback.
- The unawaited PDF upload is described above; together these account for all ten BUG rows in the inventory.

## Other changes

The remaining safe pass changes include explicit radix arguments and `Number.isNaN`, `RegExp.exec`/`String.replaceAll`, code-point-safe full-width conversion, `Set` membership, `Array.prototype.at` indexing, unused/dead imports and assignments, read-only component props, module-level calendar icons, explicit artifact control-flow braces, and separate non-mutating sort preparation. Public API type aliases, generated Supabase generic unions, generic alert/card headings, and cmdk's intentional custom attribute were not removed or renamed.

## Out of scope and uncertainty

- No files under `apps/`, `services/`, dictionaries, lockfiles, package manifests, or generated/node_modules paths were touched. Findings outside the supplied scope were not audited.
- No SonarCloud reanalysis or GitHub Actions execution was available, so the fixed/deferred counts are source-review dispositions, not a replacement Sonar report.
- The deferred findings are mainly public type-alias compatibility, minified/render-loop sequencing, scraper regex/backtracking and cognitive complexity, map curation/geometry complexity, and non-native time-picker accessibility. They should be handled in dedicated, behavior-tested passes.
