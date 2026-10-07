# Sonar web-core cleanup report

Date: 2026-10-06

The supplied SONAR_ISSUES.tsv was retained untracked. All source changes are
under the requested apps/web scope; no package, lockfile, dictionary,
generated, node_modules, commit, push, or dependency-installation changes were
made.

## Verification

### Baseline

- Command: bun run --cwd apps/web type-check
  - Exit code: 1
  - 9 TypeScript diagnostics:
    - 6 in out-of-scope src/components/Forms/\*
    - 1 in src/features/dining/useDining.ts
    - 1 missing flexsearch declaration in src/lib/local-search/flexsearch-index.ts
    - 1 in worker.ts for caches.default
- Command: bun run --cwd apps/web test
  - Exit code: 1
  - 212 passed, 2 skipped, 2 failed, 2 unhandled errors, 878 assertions
  - The failures/errors were the missing flexsearch package, the local-search
    integration setup, and the synthetic local-search worker failure.

### Final

- Command: bun run --cwd apps/web type-check
  - Exit code: 1
  - 9 diagnostics, exactly the same baseline locations and messages. No new
    diagnostic was reported in a changed file.
- Command: bun run --cwd apps/web test
  - Exit code: 1
  - 213 passed, 2 skipped, 2 failed, 2 unhandled errors, 879 assertions.
  - The additional passing test is the real parity-serialization assertion
    added to address typescript:S2187; the pre-existing failures/errors are
    unchanged.
- Command: bunx eslint <all changed .ts/.tsx files> worker.ts vite.config.ts
  - Exit code: 1 before linting files.
  - The shared config resolved through the junction checkout and requires
    missing @typescript-eslint/recommended. Installing dependencies was
    explicitly prohibited, so this check is blocked rather than reported as
    passing.
- git diff --check: passed.

## Rule disposition

Counts below refer to the rows in the supplied inventory. Because the
inventory line numbers describe the pre-edit tree, they are not re-used as
post-edit source locations.

| Rule                       | Fixed | Deferred | Judged false-positive | Disposition                                                                                                          |
| -------------------------- | ----: | -------: | --------------------: | -------------------------------------------------------------------------------------------------------------------- |
| docker:S6505               |     1 |        0 |                     0 | Added --ignore-scripts to dependency installation.                                                                   |
| docker:S7031               |     2 |        0 |                     0 | Merged the consecutive runner RUN instructions.                                                                      |
| docker:S8543               |     6 |        0 |                     0 | Pinned every bunx turbo invocation to 2.5.6.                                                                         |
| javascript:S7759           |     1 |        0 |                     0 | Replaced Date#getTime() in the HTML bootstrap.                                                                       |
| typescript:S107            |     0 |        1 |                     0 | quad is a local geometry helper; changing its parameter contract is not a safe mechanical edit.                      |
| typescript:S1128           |    11 |        0 |                     0 | Removed unused imports.                                                                                              |
| typescript:S1854           |     7 |        0 |                     0 | Removed dead class-code/settings/app assignments.                                                                    |
| typescript:S2004           |     0 |        1 |                     0 | Deep timetable callback nesting deferred.                                                                            |
| typescript:S2187           |     1 |        0 |                     0 | Added an unconditional parity-helper assertion; parity matrix tests remain opt-in.                                   |
| typescript:S2310           |     0 |        1 |                     0 | The loop-index rewind is required to skip a consumed top-level operator.                                             |
| typescript:S2871           |     3 |        0 |                     0 | Added localeCompare comparators to course/date query sorting.                                                        |
| typescript:S3358           |    20 |        7 |                     0 | Refactored small equivalent branches; deferred the CampusMap/Places JSX branches.                                    |
| typescript:S3504           |     2 |        0 |                     0 | Replaced var with const.                                                                                             |
| typescript:S3776           |     0 |       16 |                     0 | Complex map/search/reconciliation functions deferred per the task risk constraint.                                   |
| typescript:S3863           |     8 |        0 |                     0 | Merged duplicate imports.                                                                                            |
| typescript:S4165           |     1 |        0 |                     0 | Removed the redundant numeric-filter default assignment.                                                             |
| typescript:S4323           |     1 |        0 |                     0 | Named the repeated time-mask union.                                                                                  |
| typescript:S4782           |     1 |        0 |                     0 | Removed the redundant optional provider property marker.                                                             |
| typescript:S5906           |     2 |        0 |                     0 | Used toHaveLength in both flagged tests.                                                                             |
| typescript:S6035           |     0 |        1 |                     0 | Regex alternation distinguishes start-of-string from whitespace; a rewrite risks parser behavior.                    |
| typescript:S6478           |     0 |        1 |                     0 | Parent component extraction deferred with the larger CampusMap refactor.                                             |
| typescript:S6551           |     0 |       18 |                     0 | Explicit String coercion is the intentional compatibility boundary for unknown remote search fields.                 |
| typescript:S6564           |     0 |       10 |                     0 | Exported primitive aliases were retained to avoid removing public type names.                                        |
| typescript:S6571           |     0 |        0 |                     2 | Standard generated Supabase generic helper unions; no runtime behavior and no safe generated-type redesign.          |
| typescript:S6582           |     2 |        0 |                     0 | Applied optional chaining in GTM/filter code.                                                                        |
| typescript:S6594           |     6 |        0 |                     0 | Replaced flagged URL/class-code match calls with RegExp.exec.                                                        |
| typescript:S6653           |     2 |        0 |                     0 | Used Object.hasOwn.                                                                                                  |
| typescript:S6747           |     0 |        0 |                    42 | React Three Fiber JSX renderer props are valid and typed by the renderer; Sonar’s JSX model reports them as unknown. |
| typescript:S6754           |     0 |        0 |                     1 | The flagged useState is already destructured as value and setter; this is a rule false positive.                     |
| typescript:S6759           |    13 |        0 |                     0 | Marked scoped component props read-only.                                                                             |
| typescript:S6819           |     4 |        0 |                     0 | Changed status announcements to output elements.                                                                     |
| typescript:S6845           |     0 |        0 |                     1 | The focusable scrollable shop list intentionally uses tabIndex=0 for keyboard access.                                |
| typescript:S7503           |     3 |        9 |                     0 | Removed unnecessary async wrappers where possible; cache and main-thread search methods retain Promise contracts.    |
| typescript:S7741           |     3 |        0 |                     0 | Compared directly with undefined.                                                                                    |
| typescript:S7744           |     1 |        0 |                     0 | Removed the unnecessary object-spread fallback.                                                                      |
| typescript:S7747           |     3 |        0 |                     0 | Removed redundant array clones.                                                                                      |
| typescript:S7751           |     1 |        0 |                     0 | Used flat for the direct flattening case.                                                                            |
| typescript:S7754           |     4 |        0 |                     0 | Used some for existence checks.                                                                                      |
| typescript:S7755           |     5 |        0 |                     0 | Used at(-1) for last-element access.                                                                                 |
| typescript:S7758           |     3 |        3 |                     0 | Used code-point APIs where safe; retained persisted subject/tree hash code-unit behavior.                            |
| typescript:S7759           |     1 |        0 |                     0 | Used Date.now in GTM.                                                                                                |
| typescript:S7763           |     1 |        0 |                     0 | Converted the time-mask alias to a re-export.                                                                        |
| typescript:S7765           |     5 |        0 |                     0 | Used includes for exact value membership.                                                                            |
| typescript:S7766           |     1 |        0 |                     0 | Used Math.max for the non-negative weekday index.                                                                    |
| typescript:S7767           |     0 |        1 |                     0 | Tree variant hashing intentionally uses signed 32-bit overflow; Math.trunc is not equivalent.                        |
| typescript:S7770           |     1 |        0 |                     0 | Used Boolean directly.                                                                                               |
| typescript:S7772           |     2 |        0 |                     0 | Removed the unused os import and changed Vite to node:path.                                                          |
| typescript:S7773           |    18 |        0 |                     0 | Used Number.parseInt.                                                                                                |
| typescript:S7776           |     2 |        0 |                     0 | Used Set.has for locale membership.                                                                                  |
| typescript:S7780           |     1 |        0 |                     0 | Used String.raw for the regex suffix.                                                                                |
| typescript:S7786           |     1 |        0 |                     0 | Used TypeError for invalid text records.                                                                             |
| typescript:S878            |     1 |        0 |                     0 | Replaced the color conversion comma operator with statements.                                                        |
| typescript:S8786           |     3 |        0 |                     0 | Bounded filter parsing, split HTML stripping, and removed the trailing-slash regex.                                  |
| typescript:S9382           |     0 |        1 |                     0 | Sequential cache cleanup is retained to keep disposal/deletion order predictable.                                    |
| Web:FrameWithoutTitleCheck |     1 |        0 |                     0 | Added a title to the GTM noscript iframe.                                                                            |
| Web:S5254                  |     1 |        0 |                     0 | Added lang=en to the silent OIDC callback document.                                                                  |
| Web:S5725                  |     1 |        0 |                     0 | Pinned the OIDC CDN script and added SHA-384 SRI plus anonymous CORS.                                                |
| Web:S7926                  |     1 |        0 |                     0 | Removed viewport zoom suppression.                                                                                   |

## Vulnerability, hotspot, and bug details

### Docker install vulnerabilities

- docker:S6505: bun install could execute dependency lifecycle scripts in the
  image build. It now uses --ignore-scripts; this reduces build-time execution
  to the explicitly invoked build commands.
- docker:S8543: six floating bunx turbo calls could resolve an unverified
  release. Each is now bunx turbo@2.5.6, matching the repository’s declared
  Turbo version.

Exercise with docker build -f apps/web/Dockerfile . and inspect the build log
for the pinned commands. A Docker build was not run in this environment.

### OIDC CDN hotspot

public/auth/silent.html loaded oidc-client-ts@3, which was a floating major
tag without integrity metadata. It now loads the repository-aligned
oidc-client-ts@3.2.0 browser bundle with the SHA-384 digest calculated from
the fetched 200 response and crossorigin=anonymous. Exercise by loading the
silent callback in a browser and confirming the script executes; a browser
integrity/network check was not run here.

### Sorting bugs

The timetable and course-date query paths used default JavaScript sorting,
which orders strings by UTF-16 code units and can produce inconsistent
request/query keys. They now use localeCompare comparators. Exercise by
supplying course IDs with mixed numeric/lexical prefixes and confirming the
query key and API request have the same deterministic order.

### Accessibility bugs

The GTM noscript iframe now has a title, and the silent callback document now
has a language. The viewport no longer disables user zoom. Campus status
announcements use output elements while preserving their classes/content.
These markup changes were not browser-tested because the required test
environment was unavailable.

## Out-of-scope findings and limitations

- The typecheck’s six component-form errors were outside this worktree’s
  allowed scope. The dining API-client error, missing flexsearch package, and
  caches.default type error were present before editing and remain.
- The local-search test failures are dependency/environment failures, not
  regressions from this pass. Installing dependencies was prohibited because
  node_modules is a junction.
- ESLint could not start because the junction-resolved shared ESLint config
  requires a missing plugin/config package. No eslint-disable or suppression
  was added.
- React Three Fiber JSX issues were left unchanged because the reported
  attributes are renderer contracts, not unknown DOM properties.
- No SonarCloud re-analysis was available, so the rule counts above are based
  on source review against the supplied inventory rather than a post-edit
  server scan.

## Uncertainty

The CDN SRI digest was computed from the exact pinned jsDelivr URL and a 200
response, but it was not exercised in a browser. The deferred cognitive
complexity and JSX-component rules need a separate review if the team wants
further reduction; they were intentionally not addressed with risky broad
refactors.

## Correction after CI (2026-10-07)

The `--ignore-scripts` change described above was reverted. Bun runs install scripts only for trusted dependencies, and Prisma is one of them: with the flag set, `prisma generate` fails in CI with an exec format error. `docker:S6505` is therefore deferred, not fixed.

The viewport change described above was also reverted: `user-scalable=no` is kept, because removing it changes how the installed PWA behaves on phones and was outside this cleanup.
