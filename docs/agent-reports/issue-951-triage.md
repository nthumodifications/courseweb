# Issue #951 API triage

## Existing

- `mapTriageLabels` passed through only `bug`, `search`, and `timetable`.
- `redactPublicText` removes email addresses, Taiwan mobile numbers, and shaped student IDs.
- The request schema, diagnostics validation, form, and web app were already shipped.

## Changes

- Added one fixed GitHub-label allowlist and explicit type, area, and route maps.
- Client-supplied labels still accept only `generic`; mapped labels are deduplicated and allowlisted.
- Added linear, span-preserving redaction for full-width digits, Taiwan mobile numbers in local and `+886` forms, and shaped student IDs.
- Mobile numbers accept spaces, hyphens, periods, and parenthesized groups; student IDs use `080`–`119` admission-year prefixes (ROC years 80–119) and optional `s`/`S`/`u`/`U` prefixes.
- Student IDs are preserved in URL path/query contexts when adjacent to `/`, `=`, `#`, `-`, or `_`; `123456789` is preserved because it is outside the shaped ID range.

| Input                                                    | GitHub label                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| type `bug`, `missing-data`, `suggestion`, `praise`       | `bug`, `bug`, `enhancement`, `commend`                                    |
| area `timetable`, `search`, `sync-login`, `bus`, `other` | `timetable`, `search`, `sync`, `apps`, none                               |
| route fallback for `other`/absent area                   | calendar→`calendar`, courses→`courses`, timetable→`timetable`, bus→`apps` |

## Public-body contract and safety tests

- `redactPublicText` runs on the title and on the combined user text plus formatted, validated diagnostics block.
- Every client-controlled diagnostics string is redacted before backticks and `@` are sanitized; the GitHub payload test covers title, body, and diagnostics email, phone, and student-ID values.
- A realistic full diagnostics block is asserted byte-identical after redaction; only user/title sensitive values change.
- Preserved byte-identical false-positive cases: `123456789`, `11410CS 135601`, `11410EECS203001`, `11410`, issue URL/`#951`, ISO timestamp, 13-digit epoch milliseconds, 40-character SHA, numeric `1234567` SHA, `1920x1080`, `2026.10.11`, URL-path/query IDs, `ERR_509062123`, and `1090621234`.
- Positive table-driven cases cover email, full-width phone and student-ID digits, local mobiles with periods/parentheses, all equivalent `+886` forms, `109062123`, CJK neighbours, `s`/`S`/`u` prefixes, and `id:`/`學號` contexts.
- A 10,000-character adversarial input is timed to complete within one second.

## Verification

- `bun test src/issue.test.ts`: 78 pass, 0 fail, 112 assertions.
- `bun test src`: 577 pass, 0 fail, 577 tests across 43 files, 7,209 assertions.
- `bunx tsc --noEmit -p .`: passed.
- `bunx prettier --check` on the two touched source/test files: passed.

The private contact field from #951 remains unimplemented, as requested; no schema or web work was added.
