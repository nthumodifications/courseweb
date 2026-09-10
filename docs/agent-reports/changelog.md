# Changelog delivery report

## Changes

- `apps/web/src/const/changelog.ts` — Added typed, bilingual, newest-first release notes grouped from the latest 40 commits on this branch.
- `apps/web/src/app/[lang]/(mods-pages)/(side-pages)/changelog/page.tsx` — Added the responsive localized changelog page with locale-aware dates and type badges.
- `apps/web/src/components/Changelog/WhatsNewDialog.tsx` — Added the localStorage-backed highlighted-release dialog with onboarding deferral and changelog link.
- `apps/web/src/router.tsx` — Added the lazy `/changelog` route and bilingual SEO handle metadata.
- `apps/web/src/components/Footer.tsx` — Added the localized changelog link beside the existing side-page links.
- `apps/web/src/layouts/MainLayout.tsx` — Mounted the dialog once through a lazy import and a null Suspense fallback.
- `apps/web/src/dictionaries/en.json` — Added English changelog page, dialog, and type-label strings.
- `apps/web/src/dictionaries/zh.json` — Added matching Taiwan Traditional Chinese changelog page, dialog, and type-label strings.

## Dialog cases

- Fresh install: `useLocalStorage` returns `null`; the current highlighted version is written to `last_seen_changelog_version` and the dialog remains closed.
- Same release: a stored version equal to the highlighted release returns without opening.
- Upgrade: an older stored version opens the dialog after `hasVisitedBefore` becomes `true` and no Radix dialog is open; this waits for the existing Help walkthrough to finish so dialogs do not stack. Dismiss or “View all changes” stores the current version.

## Maintainer update workflow

Add a `ChangelogRelease` object to `apps/web/src/const/changelog.ts` in newest-first order with an ISO date and bilingual title/items; set `highlight: true` on the release to announce.

## Manual steps and scope

No DB migration, environment variable, dependency, dictionary-generation command, or deployment step is required. No changes were made to `Header.tsx`, the recruit route, PWA/Help/Alerts components, or any database/API schema; no commit or push was performed.

## Verification

- `bunx prettier --check` on all changed source/config files — passed.
- `git diff --check` — passed (only Git's existing LF/CRLF normalization warnings were emitted).
- `bun run build` from `apps/web` — passed; the build emitted a separate `WhatsNewDialog` chunk. Existing Browserslist, Tailwind deprecation, PDF `eval`, and large-chunk warnings remain.
- Final `cd apps/web && bunx tsc --noEmit` — 8 errors, matching the stated baseline: one `shops/page.tsx` TS2322, six `errorData` TS18046 diagnostics in the two issue dialogs, and one `worker.ts` TS2339.
- Dictionary key-tree comparison — passed; `en.json` and `zh.json` remain structurally identical.

## Unverified or remaining issues

No known changelog implementation is stubbed or broken. Browser-level manual verification at both routes/locales and the three localStorage scenarios was not run, and no automated UI tests were added.
