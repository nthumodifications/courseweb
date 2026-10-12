# Issue #951 API triage

## Existing

- `mapTriageLabels` passed through only `bug`, `search`, and `timetable`.
- `redactPublicText` removed email addresses only.
- The request schema, diagnostics validation, form, and web app were already shipped.

## Changes

- Added one fixed GitHub-label allowlist and explicit type, area, and route maps.
- Client-supplied labels still accept only `generic`; mapped labels are deduplicated and allowlisted.
- Added boundary-aware redaction for 9-digit student IDs and Taiwan mobile numbers in local and `+886` forms.

| Input                                                    | GitHub label                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| type `bug`, `missing-data`, `suggestion`, `praise`       | `bug`, `bug`, `enhancement`, `commend`                                    |
| area `timetable`, `search`, `sync-login`, `bus`, `other` | `timetable`, `search`, `sync`, `apps`, none                               |
| route fallback for `other`/absent area                   | calendar→`calendar`, courses→`courses`, timetable→`timetable`, bus→`apps` |

## Public-body contract and safety tests

- `redactPublicText` runs on the title and on the combined user text plus formatted, validated diagnostics block.
- A realistic full diagnostics block is asserted byte-identical after redaction; only user/title sensitive values change.
- Preserved byte-identical false-positive cases: `11410CS 135601`, `11410EECS203001`, `11410`, issue URL/`#951`, ISO timestamp, 13-digit epoch milliseconds, 40-character SHA, numeric `1234567` SHA, `1920x1080`, and `2026.10.11`.
- Positive cases cover email, `109062123`, local mobiles, and `+886` mobile forms.

## Verification

- `bun test src/issue.test.ts`: 55 pass, 0 fail, 86 assertions.
- `bun test src`: 553 pass, 1 fail, 554 tests, 7,182 assertions. The unrelated existing `src/aca-calendar.test.ts` overlap test expected no events but received two current course-selection events.
- `bunx tsc --noEmit -p .`: passed.
- `bunx prettier --check` on all three touched files: passed.

The private contact field from #951 remains unimplemented, as requested; no schema or web work was added.
