# v2 foundation report

Implemented the shared `EmptyState` and `ErrorState` primitives, exported them
from `@courseweb/ui`, and added localized live examples to the design-system
page. The default state is a compact left-aligned flow item. `fullPane` is the
explicit viewport exception; it is not used by the default example.

The design linter now has baseline-aware enforcement and these additional
rules: `centered-layout`, `reading-column`, `cjk-hostile`, `synthetic-weight`,
and `spacing-vocab`. `centered-layout` only treats `justify-center` and
`items-center` as layout violations when the same class attribute also has
`min-h-*`, `h-full`, or `h-screen`, so ordinary icon/label rows are not flagged.
`reading-column` only inspects the direct returned root opening tag of page or
page-section files.

## Starting violation counts

These are the pre-change counts from the final rule set, before adding the two
primitives and their examples. The existing four-rule counts retain the
linter's narrow intentional allowlist.

| Rule               | Starting findings |
| ------------------ | ----------------: |
| `hardcoded-color`  |               356 |
| `dark-color`       |               238 |
| `large-type`       |                11 |
| `overlay-shadow`   |                35 |
| `centered-layout`  |                44 |
| `reading-column`   |                 6 |
| `cjk-hostile`      |                31 |
| `synthetic-weight` |               163 |
| `spacing-vocab`    |               535 |

No requested rule was left out. The centered rule was kept because its
same-attribute height guard makes it precise enough to avoid flagging the
common single-row icon/label alignment case. `spacing-vocab` leaves `*-auto`
to `centered-layout`; numeric and arbitrary padding, margin, and gap values
outside 1 / 2 / 4 / 6 remain in scope.

`fullPane` is genuinely justified as a named escape hatch for a signed-out
chat pane when the whole viewport is blocked until the user acts. That state
has a different layout responsibility from an empty region inside a page, so
the default rendering should not absorb the centered behavior. If the chat
container already owns the viewport and can place the default state correctly,
the escape hatch could later be deleted, but it should remain exceptional.

## Verification

- `bunx tsc --noEmit -p packages/ui/tsconfig.json`: passed.
- `cd apps/web && bunx tsc --noEmit`: failed with exactly the 8 stated
  pre-existing errors: 1 in `shops/page.tsx`, 3 in each issue form dialog,
  and 1 in `worker.ts`; no new errors were added.
- `cd apps/web && bun test src`: passed, 103 tests.
- `node tools/design-lint/index.mjs`: passed against the regenerated baseline.
- `bunx prettier --check` on all changed source/config files: passed.
- `bun run design-lint`: could not be invoked because the root
  `package.json` has no `design-lint` script. The direct linter command above
  passes.
- No browser was available, so `/zh/design-system` was not visually checked.

Only the requested foundation files, design-system page, lint tool/baseline,
and this report were changed. The bus page and Timetable components were not
touched. No rule, page shell, or page header was added.
