# Token sweep report

## S5 — theme tokens

Replaced hardcoded gray/slate/zinc/neutral chrome and hand-written dark colour
overrides across the touched app and UI animation files with the existing
semantic tokens: `foreground`, `muted-foreground`, `background`, `card`,
`muted`, `accent`, `border`, `primary`, `destructive`, `success`, `warning`,
and `info`. Error, success, warning, and notice states now use the semantic
status tokens, including the syllabus summary, planner status surfaces, PDF
retry state, bus notices, chat errors, and timetable notices.

The source-colour sweep went from 320 hardcoded-colour findings to 3 and from
174 dark-colour findings to 4. The remaining findings are intentional:

- weather icon colours in `WeatherIcon.tsx`;
- the fixed planner folder-colour palette;
- map sky/label palette values in `CampusScene.tsx`;
- the protected `ui/alert.tsx` dark border and the admin announcement state.

I also kept real data colours untouched: course and bus-line colours, weather
icons, the `no_class` hatch/contrast treatment, folder colours, and the Help
page's mock course/illustration colours.

## S6 — surfaces and states

The touched states now use token-backed surfaces and foregrounds, with cards
and inset notices using `bg-card`, `bg-background`, `bg-muted`, or low-opacity
semantic status fills. Existing focus-visible rings remain in place. No new
user-facing strings were introduced, so dictionary trees did not need changes.

## S8 — typography and numerals

Constrained `(mods-pages)` routes now have no `text-2xl` or larger utility
outside the excluded `(side-pages)` subtree. The large-type lint count dropped
from 10 to 0. Headings were brought to `text-xl` with weight where needed.

Added `tabular-nums` to calendar and timetable times, bus times, course IDs,
credits, planner credit summaries, grade tables, score values, and timetable
course/credit totals.

## S9 — radius, shadow, and spacing

Normalised touched cards and dialogs to `rounded-lg`, controls to `rounded-md`,
chips to `rounded-sm`, and circular indicators to `rounded-full`. Removed
non-overlay `shadow-sm`/`shadow-md` from touched calendar, grade-chart, Help,
and timetable surfaces. The remaining nine shadow findings are overlay-like
map labels, the calendar replication status badge, and protected/admin/UI
files.

Moved touched off-scale spacing to the nearest allowed step where it did not
change geometry. The `pb-20` bottom-nav clearance and drawer `mt-24`/custom
top radius remain deliberately unchanged because they prevent content from
sitting under the mobile navigation or define drawer geometry.

## Baseline and verification

The design-lint baseline before this sweep contained 50/44/5/25 files for
hardcoded-colour, dark-colour, large-type, and overlay-shadow respectively,
with 355/230/11/39 recorded findings. It now contains 2/3/0/8 files and
3/4/0/9 findings. `large-type` is therefore ready to become a hard failure.

Verification results:

- `bun run design-lint`: passed; no new violations.
- `cd apps/web && bunx tsc --noEmit`: still fails with the same eight
  pre-existing diagnostics (shops page `unknown`, the two issue-dialog
  `errorData` groups, and `worker.ts` `CacheStorage.default`); no new errors.
- `git diff --check`: passed.
- Browser checks at 1440x900 and 390x844 in both themes could not be run in
  this worktree because no browser preview/runner is available. The timetable
  grid structure was not changed.

## Follow-up

No new shared component was created. The existing `@courseweb/ui` primitives
and tokens were sufficient. The residual protected/admin/data findings should
remain explicit baseline entries until their owning agents can change them or
the lint tool gains path-aware exclusions.
