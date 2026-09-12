# Side pages report

## What changed

- **TM1–TM4:** `/team` is now dictionary-backed in both locales, uses the shared shell/header/sections, has an equal-height two-column member grid with consistent 64px cropped avatars and aligned action rows, and only renders the dedicated-member section when data exists. The empty dedicated-member dataset no longer produces a heading with no content.
- **I1–I3:** `/issues` is now Chinese-first through `zh.json`/`en.json`; source links have readable labels and the shared link treatment; the form uses the standard labels/input/textarea/button arrangement and now exposes translated validation, success, and failure states.
- **CT1–CT4:** `/contribute` keeps its existing section order and sponsor presentation, but stat tiles now use neutral card surfaces and tabular numbers, all external actions use outline buttons with icons, the finance heading no longer contains an emoji, and the centered hero/closing CTA use the page/card surfaces without tinted bands.
- **R1–R4:** `/recruit` uses a centered display header with consistently left-aligned sections, skeleton loading, retryable `EmptyState` failures, an outline/ghost secondary team action, and the normalized footer. The shared footer now has one bordered, token-based layout and link treatment for every side page.
- **Long-form pages:** `/changelog`, `/privacy-policy`, `/next-steps`, and `/proxy-login` now use `PageShell width="content"`, the single display-title scale, `Section`, capped prose, dictionary copy, consistent localized dates, inset flow diagrams, and the same footer. Proxy-login links are now localized router links or readable external links.
- Updated the unused `Static/TeamContainer` to use the team dictionary and `Section` rather than retaining a second hand-built heading treatment.

## Rules and practical notes

- No `LANGUAGE.md` rule was impossible to apply to the files in scope. The title requirement works by passing a localized display span through the shared `PageHeader`, preserving the shared header API while keeping one `text-4xl font-bold tracking-tight` title.
- The existing localized release content remains in `apps/web/src/const/changelog.ts`; moving that data into the dictionaries would require editing a file outside this task’s ownership. The page’s labels still come from both dictionaries.
- `IssueFormDialog` is an existing shared component used by the contribution page, but it still contains hardcoded bilingual dialog copy. It was outside the named files and was left untouched to avoid overlapping another agent’s scope.

## Left undone

- The foundation report’s `ErrorState` component is not present in this worktree. Recruit therefore uses the required `EmptyState` with a retry action and should be switched to `ErrorState` when that shared component lands.
- No `web-for-beginners` page source exists under `apps/web/src` in this worktree. The proxy-login page still links to the existing `/web-for-beginners/...` destinations, but there was no owned page file to migrate.
- A browser/screenshot runner is not installed in this worktree, so the requested 1440×900 and 390×844 light/dark visual pass could not be executed interactively. Static checks cover responsive collapse classes, shell-owned gutters/bottom clearance, overflow wrappers for diagrams, focusable shared buttons, and removal of the audited hardcoded color/type violations.

## Shared promotion

Promote the pending `ErrorState` into `@courseweb/ui` once available. No additional local primitive was needed: `PageShell`, `PageHeader`, `Section`, `EmptyState`, `PageSkeleton`, and existing controls covered these pages.

## Verification

- `cd apps/web && bunx tsc --noEmit`: unchanged eight pre-existing diagnostics in `shops/page.tsx`, `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, and `worker.ts`; no new diagnostics.
- `bun run design-lint`: passed; touched side-page baseline violations were cleaned without adding any new violation.
- `git diff --check`: passed.
- zh/en dictionary key-tree comparison: passed.
- No commit, push, checkout, or `gh` command was run.
