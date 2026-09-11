# Admin announcements page

## Built

- Replaced the announcements placeholder with a responsive list of all announcements, including inactive drafts, severity/status badges, Taipei-localized windows, priority, dismissibility, edit actions, and AlertDialog-protected deletion.
- Added create/edit dialog fields matching the secure API schema, client-side length/range/date/link validation, mutation error display in the dialog, and success/failure toasts.
- Added explicit Asia/Taipei conversion between `datetime-local` values and offset-bearing API timestamps.
- Added a live banner preview matching the public announcement renderer's severity styles, title/description layout, link behavior, and dismiss affordance.

## Files touched

- `apps/web/src/app/[lang]/admin/announcements/page.tsx`
- `docs/agent-reports/admin-announcements.md`

## Verification

Typecheck command:

```text
cd apps/web && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep admin
```

Exact output:

```text
(no output)
```

Prettier check:

```text
bunx prettier --check apps/web/src/app/[lang]/admin/announcements/page.tsx
Checking formatting...
All matched files use Prettier code style!
```

`git diff --check` also passed. No other checks or changes were made.

## Could not do

Nothing outstanding.
