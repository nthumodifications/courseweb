# Issue 941 inventory report

Removed superseded files. After deletion, each command below returned no output outside `docs/agent-reports`.

- `docs/plans/2026-02-28-settings-page-complete-redesign.md`: `git grep -n -- '2026-02-28-settings-page-complete-redesign.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings components and #947.
- `docs/plans/2026-02-28-settings-page-implementation.md`: `git grep -n -- '2026-02-28-settings-page-implementation.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings components and #947.
- `docs/plans/2026-02-28-settings-page-redesign.md`: `git grep -n -- '2026-02-28-settings-page-redesign.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings components and #947.
- `docs/SETTINGS_RESPONSIVE_FIX_SUMMARY.md`: `git grep -n -- 'SETTINGS_RESPONSIVE_FIX_SUMMARY.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings source.
- `docs/responsive-settings-fix.md`: `git grep -n -- 'responsive-settings-fix.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings source.
- `docs/responsive-testing-guide.md`: `git grep -n -- 'responsive-testing-guide.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by the current settings source and normal web checks.
- `docs/DESIGN_SYSTEM_README.md`: `git grep -n -- 'DESIGN_SYSTEM_README.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by `docs/design/` and the live design-system page.
- `docs/plans/ui-redesign-plan.md`: `git grep -n -- 'ui-redesign-plan.md' -- . ':(exclude)docs/agent-reports/**'`; superseded by `docs/design/LANGUAGE.md` and `PHILOSOPHY.md`.

Kept `docs/design-system.md`: `LANGUAGE.md` and `PHILOSOPHY.md` do not fully replace its component and token catalog, so deleting it would remove live guidance.

- `docs/design/**`: current design guidance. `docs/agent-reports/**`: historical reports.
- `docs/GTM_SETUP.md`: GTM remains live in `apps/web/index.html` and `apps/web/src/lib/gtm.ts`.
- `docs/security-review-notes.md`: browser-storage risk remains true; its deferred-issue sentence is stale.
- `docs/search-fallback.sql`: its indexes still support the Supabase fallback search.
- `docs/superpowers/**`: retained planning records, not current contracts.
- `docs/plans/2026-05-28-customization-overhaul.md`: partly true shipped customization plan; proposed schema migration is not present.

The only manager-list difference is deploy: #929 and #804 are closed, but `.github/workflows/build.yaml` still contains the D1 skip and route-sync warning paths. #941 is still not done: each inventory item needs its own issue, and removal release notes are still required. Neither was created here.
