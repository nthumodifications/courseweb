# `/apps` list-versus-grid report

Applied the responsive layout correction from `docs/design/LANGUAGE.md` §4 and
`docs/design/PHILOSOPHY.md` principle 4.

## Audit verdicts

- `/zh/apps`: **grid on desktop, one-column stack on mobile**. App categories
  are complete groups, so their visible bordered cards remain; app entries are
  compact peer entry points without a right-edge answer.
- `/zh/community`: **list**. Each timetable row carries live/snapshot state and
  optional difficulty at the right edge.
- `/zh/team`: **grid on desktop, one-column stack on mobile**. Member entries
  carry identity and social actions, but no right-edge answer.
- `/zh/contribute`: **grid on desktop, one-column stack on mobile** for sponsor
  entries, community stats, feedback actions, and developer actions. None has a
  right-edge answer; the stat values are inline with the identity rather than
  being right-edge answers.
- `/zh/next-steps`: **no list/grid change**. This page is prose with sections,
  not a repeated entry list.

The pinned-apps edit dialog in `/zh/apps` remains a narrow `divide-y` list: its
star toggle is the right-edge answer.

## `/apps` column counts

The previous layout had one category column and one app column at every tested
width because the current pass used full-width flex/list containers. The
restored layout uses `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3` for categories
and `grid-cols-1 md:grid-cols-2` within each category.

| viewport | before: categories / apps per category | after: categories / apps per category |
| --- | ---: | ---: |
| 390px | 1 / 1 | 1 / 1 |
| 1024px | 1 / 1 | 2 / 2 |
| 1440px | 1 / 1 | 3 / 2 |

## Verification

- `cd apps/web && bunx tsc --noEmit`: reports exactly the 8 stated baseline
  errors (shops/page.tsx, the two issue form dialogs, and worker.ts); no new
  errors.
- `cd apps/web && bun test src`: 103 passed, 0 failed.
- `bun run design-lint`: passed with no new violations.
- Dev server on port 5183 started successfully and `GET /zh/apps` returned
  HTTP 200. No browser executable or Playwright runner is available here, so
  visual checks at 1440x900, 1024px, and 390x844 remain unverified.
