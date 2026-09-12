# `/apps` category grid and narrow-container report

Date: 2026-09-11

## Result

- Kept the outer category grid at `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`.
- Changed apps inside each category to one column at every width.
- Added `items-start` to the outer grid so the `常用功能` card sizes to its
  content instead of stretching to its row peer.
- Made app labels flexible with `min-w-0` and `flex-1`; badges are `shrink-0`
  in both `AppItem` and the pinned-apps dialog.
- Changed the Traditional Chinese empty-state hint to
  `可以到右上角新增常用功能。`.
- Did not change the pinned dialog's `divide-y` list structure, `bus/`,
  `components/Timetable/`, `packages/ui`, or any other page.

## Browser verification

Started the worktree dev server with `bun run dev --port 5184` and loaded
`http://localhost:5184/zh/apps` in Playwright. All 13 app labels were checked
at each viewport; every label remained one rendered line (`height` and
`scrollHeight` both 24px), and all three `測試` badges remained one line
(`scrollHeight` equaled `clientHeight`).

| viewport | `互動式校園地圖` | `體育場館使用人數` | `竹梅活動觀測站` | badges |
| --- | --- | --- | --- | --- |
| 1440x900 | 330.1px wide, 1 line | 379.7px wide, 1 line | 379.7px wide, 1 line | 3, no wrap |
| 1024x768 | 349.2px wide, 1 line | 398.8px wide, 1 line | 398.8px wide, 1 line | 3, no wrap |
| 390x844 | 212px wide, 1 line | 261.6px wide, 1 line | 261.6px wide, 1 line | 3, no wrap |

At 1440x900, the `常用功能` card measured 113.6px high while the adjacent
`校園生活` card measured 353.6px high, confirming that the row no longer
stretches the shorter card.

## Verification

- `cd apps/web && bunx tsc --noEmit`: exactly the 7 stated pre-existing
  errors—6 across `GenericIssueFormDialog.tsx` and `IssueFormDialog.tsx`, and
  1 in `worker.ts`; no new errors.
- `cd apps/web && bun test src`: 103 passed, 0 failed.
- `bun run design-lint`: no new violations.
- `git diff --check`: passed.
- No commit, push, or `gh` command was run.
