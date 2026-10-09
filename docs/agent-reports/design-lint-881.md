# Design-lint debt report: #881

Before = untouched `bun run design-lint`; scoped counts were extracted from the same findings.

| rule | before total | before in-scope | after total | after in-scope |
| --- | ---: | ---: | ---: | ---: |
| hardcoded-color | 285 | 245 | 40 | 0 |
| dark-color | 145 | 106 | 39 | 0 |
| large-type | 11 | 9 | 2 | 0 |
| overlay-shadow | 20 | 4 | 16 | 0 |
| centered-layout | 20 | 8 | 20 | 8 |
| reading-column | 0 | 0 | 0 | 0 |
| cjk-hostile | 31 | 14 | 14 | 0 |
| synthetic-weight | 83 | 16 | 67 | 0 |
| spacing-vocab | 275 | 56 | 219 | 0 |

The three out-of-scope local-search test false positives are gone because the linter now skips `*.test.*`; no baseline/ignore/hard-failure change was made. Full lint still exits 1 on unchanged out-of-scope findings.

Files changed: `tools/design-lint/index.mjs`; all touched files under `admin/**`, `student/grades/**`, `student/parcel/page.tsx`, `student/planner/**`, and `waitlist/page.tsx`. `ISSUE-881.md` remains untracked and is not included.
Exact admin files: `announcements/page.tsx`, `audit/page.tsx`, `clients/page.tsx`, `components.tsx`, `layout.tsx`, `page.tsx`, `recruitment/page.tsx`, `users/page.tsx`, `users/[userId]/page.tsx`.
Exact student files: `grades/ClassRankChart.tsx`, `grades/DeptRankChart.tsx`, `grades/GPAChart.tsx`, `grades/GradeTracker.tsx`, `grades/GradesViewer.tsx`, `parcel/page.tsx`.
Exact planner files: `SemesterPlanning.tsx`, `components/bulk-actions/bulk-actions-menu.tsx`, `components/course-list/course-grid-item.tsx`, `components/course-list/course-list-empty.tsx`, `components/course-list/course-list-header.tsx`, `components/course-list/course-list-item.tsx`, `components/dialogs/course-details-dialog.tsx`, `components/dialogs/course-edit-dialog.tsx`, `components/folder-nav/folder-nav-item.tsx`, `components/semester-selection-dialog.tsx`, `components/semester/semester-header.tsx`, `components/sidebar/folder-navigation.tsx`.
Exact planner support files: `course-picker/ExpandableClassFilter.tsx`, `course-picker/ExpandableFilter.tsx`, `course-picker/PlannerCourseListItem.tsx`, `course-picker/PlannerSearchContainer.tsx`, `course-picker/container.tsx`, `folder-management.tsx`, `lib/status.tsx`, `page.tsx`, `planner-settings.tsx`, `semester-management.tsx`.
Exact remaining file: `waitlist/page.tsx`. No local-search test files were changed; their false positives are handled by the linter skip.

Visible substitutions (repeated identical occurrences are grouped by file and line):

- `GradesViewer.tsx:93,124,162,165,174-175,189,246,249,309,327,342,382,463`: slate/zinc text and dark pairs -> `text-foreground`/`text-muted-foreground`; slate borders/dividers -> `border-border`/`divide-border`; `text-2xl/3xl font-semibold` -> `text-xl font-medium`. Difference: theme-aware neutral text/borders and smaller, non-synthetic headings.
- Planner list/dialog files (including `course-grid-item.tsx:142,166,172,223,233,253,255`, `course-list-empty.tsx:49-179`, `course-details-dialog.tsx:66-122`, `course-edit-dialog.tsx:106-249`, `folder-management.tsx:590-1214`, `semester-management.tsx:396-797`): neutral/dark surface pairs -> `bg-card`/`bg-muted`/`bg-muted/50`; gray/neutral text -> `text-muted-foreground`; neutral borders -> `border-border`. Difference: semantic tokens follow the active theme; status hues remain green/blue/red.
- `planner/lib/status.tsx:6-19`: removed dark status overrides; retained green/blue/red state colors; planned -> `bg-muted text-muted-foreground border-border`. Difference: status meaning remains, with tokenized neutral planned state.
- `folder-navigation.tsx:130-211`, `page.tsx:757-781`, `SemesterPlanning.tsx:110-494`, `planner-settings.tsx:476-776`: neutral status/surface classes -> semantic tokens. Difference: neutral planned/secondary content adapts through tokens.
- `ClassRankChart.tsx:33,36,44`, `DeptRankChart.tsx:33,36,44`, `GPAChart.tsx:30,33,41`: `shadow-sm` removed and `uppercase` removed. Difference: flat chart surfaces and Chinese-safe labels.
- `GradeTracker.tsx:284,340,350,363,508`, `admin/components.tsx:19,47,76`, `admin/page.tsx:75-79`, `admin/layout.tsx:46,131,173`, `admin/clients/page.tsx:521,701,705,890,903`: large/synthetic/hostile typography and oversized spacing -> `text-xl`, `font-medium`, allowed spacing, no transform. Difference: denser, regular/medium/bold typography.
- `planner/course-picker/PlannerCourseListItem.tsx:35-113`, `ExpandableClassFilter.tsx:118-151`, `ExpandableFilter.tsx:144-166`, `container.tsx:94-260`: dark/color-neutral pairs and non-vocabulary spacing -> semantic colors and nearest 4/8/12/16/24 values. Difference: compact controls retain their role with small spacing normalization.
- `GradesViewer.tsx:243-340`, `planner/course-list/course-grid-item.tsx:153,172`, `planner/page.tsx:579,690`, `admin/announcements/page.tsx:522,671`, `admin/audit/page.tsx:207`, `admin/users/page.tsx:156`, `admin/users/[userId]/page.tsx:81,133-755`: out-of-vocabulary spacing -> nearest allowed/reduced spacing. Difference: less excess whitespace; no behavior change.
- `student/parcel/page.tsx:104,111-117`: commented example classes tokenized; no rendered behavior changes.
- `waitlist/page.tsx:8`: `text-4xl` -> `text-xl`. Difference: waitlist title follows the product type ceiling.

Needs a design decision:

- `student/planner/page.tsx:756,768,780`: `items-center justify-center` are inside 44px mobile navigation buttons, so they align icon/text rather than center a page.
- `waitlist/page.tsx:6`: full-height centered message gate; moving it left would materially change the gate’s presentation.

Reviewer screenshot routes (use `zh` or `en`):

- `/[lang]/admin`, `/[lang]/admin/announcements`, `/[lang]/admin/audit`, `/[lang]/admin/clients`, `/[lang]/admin/recruitment`
- `/[lang]/admin/users` and `/[lang]/admin/users/<userId>`
- `/[lang]/student/grades`, `/[lang]/student/parcel`
- `/[lang]/student/planner`: mobile nav plus course-picker, folder-management, semester-management, and planner-settings dialogs
- `/[lang]/waitlist`

Verification: `git diff --check` passed. `bunx tsc --noEmit -p apps/web` has no errors in touched files, but reports existing errors in untouched planner replication, issue-report form, and worker files. `bun test tools/design-lint` found no design-lint test files.

## Fix round 1

- Finding 1: no success/info status token or CSS variable exists; restored original dark pairs at `course-grid-item.tsx:233`, `course-list-empty.tsx:92,96`, `PlannerCourseListItem.tsx:45`, `container.tsx:99`, `folder-management.tsx:1167,1214`, `lib/status.tsx:6,8,10,16-18`, and `planner-settings.tsx:776` (22 deliberate `dark-color` matches).
- Finding 2: corrected nearest spacing at `GradeTracker.tsx:284,508`, `GradesViewer.tsx:243-244`, `course-list-empty.tsx:49,137,177`, `course-grid-item.tsx:172`, `course-list-item.tsx:185`, `folder-navigation.tsx:160`, `course-picker/container.tsx:260`, `admin/announcements/page.tsx:522`, `admin/audit/page.tsx:207`, `admin/components.tsx:76`, `admin/layout.tsx:122,173`, `admin/users/page.tsx:156`, and `admin/users/[userId]/page.tsx:755`.
- Finding 3: kept `font-bold` for the primary grades numbers/headings at `GradeTracker.tsx:340,350,363`, `GradesViewer.tsx:165,246,327,463`, and `admin/components.tsx:19,47`.
- Final in-scope counts: hardcoded-color 0; dark-color 22 deliberate restorations; large-type 0; overlay-shadow 0; centered-layout 8 unchanged; reading-column 0; cjk-hostile 0; synthetic-weight 0; spacing-vocab 0.
- Final lint totals: hardcoded-color 40, dark-color 61, large-type 2, overlay-shadow 16, centered-layout 20, reading-column 0, cjk-hostile 14, synthetic-weight 67, spacing-vocab 227. `bun run design-lint` reports only unchanged out-of-scope baseline findings; touched files add none beyond the listed restorations.
- `bunx tsc --noEmit -p apps/web`: no errors in touched files; existing errors remain in `planner-replication.tsx`, `IssueReportForm.tsx`, and `worker.ts`.
