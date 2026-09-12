# Side-pages structure report

## Changes

- Migrated contribute, recruit, team, issues, changelog, privacy-policy,
  next-steps, and proxy-login to the shared `PageHeader` shape: one
  `PageShell width="content"`, a plain localized title, and no page-specific
  header variants or display-size title wrappers.
- Contribute now keeps the sponsor block and statistics left-aligned. Its
  closing CTA is a normal plain `Section` with the existing description and a
  left-aligned action row; the primary action remains the only default button
  in that section.
- Recruit now keeps the team/sign-in actions in the open-roles section, wraps
  each application/loading/error/empty state in a `Section`, and turns the
  sign-in note into ordinary copy in the open-roles section. The existing one
  default sign-in/form action is ranked ahead of ghost/outline actions.
- Team’s core-member profile content is left-aligned, and the issue form’s
  submit action is left-aligned.
- Privacy-policy and next-steps keep their intro/closing copy inside the first
  and last existing sections. Proxy-login keeps its note as ordinary copy in
  the “what is proxy login” section. This removes free-floating post-header
  blocks without adding new copy or changing section order.
- Removed all `text-center`, `text-4xl`, `text-3xl`, and `text-2xl` hits from
  the side-pages tree. Remaining `items-center` utilities only vertically
  align icons/date/file controls; they do not center page content.

## Language rules and audit coverage

No rule in `LANGUAGE.md` proved wrong or impractical. Because `Section` requires
a title, introductory and closing prose had to be folded into adjacent existing
sections rather than inventing artificial localized headings or leaving
free-floating blocks. No dictionaries required changes; all user-facing copy
continues to come from the existing identical zh/en key trees.

No new shared component is proposed. The changes use the existing
`@courseweb/ui` `PageShell`, `PageHeader`, `Section`, `EmptyState`, and
`PageSkeleton` primitives.

## Verification

- `cd apps/web && bunx tsc --noEmit`: final output matches the captured
  baseline exactly: the existing shops `unknown` type error, three
  `GenericIssueFormDialog` `unknown` accesses, three `IssueFormDialog`
  `unknown` accesses, and the existing `CacheStorage.default` worker error.
- `bun run design-lint`: passes with no new violations (3 hardcoded-color, 4
  dark-color, 0 large-type, and 9 overlay-shadow occurrences in the existing
  baseline).
- The requested grep for `text-center`, `text-4xl`, `text-3xl`, and `text-2xl`
  in `(side-pages)` is empty.
- `git diff --check` passes.
- No browser executable is available in this environment, so the requested
  1440×900 and 390×844 light/dark visual checks were not run. No claim is made
  about those runtime screenshots.
