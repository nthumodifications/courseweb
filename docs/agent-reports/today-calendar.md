# Today and calendar report

## Audit coverage

- **T1:** Added `groupConsecutiveEmptyDays` to `useUpcomingEvents.ts`. `TodaySchedule` now collapses consecutive truly empty days into one range row, gives isolated days their own localized date and weekday, and keeps the warmer today copy only for an isolated today row. Range rows have a quiet expandable disclosure. Class dates, academic dates, personal calendar dates, and available weather prevent the today-column collapse, so content is not silently lost.
- **C1–C2:** The calendar rail uses the same consecutive-empty grouping and `EmptyState size="sm"` as `UpcomingEventList`, which is also used by the sidebar and the today next-up state. Its range disclosure restores each day, including that day’s weather and academic/calendar content. The sidebar remains a single shared empty state instead of repeating one per day.
- **T2:** Changed the default today route to `PageShell width="app"` and removed the fixed `md:grid-cols-[380px_auto]` wrapper. The existing reading order and blocks remain unchanged.
- **T3:** Converted the no-course reminder and next-up block to `Section variant="card"`. The today page no longer adds a separate upcoming-events section, so the nearby containers do not use three competing treatments.
- **T4:** Kept the upcoming-events block in `AppSidebar` as the persistent/global location and removed the duplicate content-column block. The calendar page still owns its rail and its mobile equivalent because those are part of calendar navigation rather than the global sidebar.
- **T5:** Added `min-w-0`/wrapping constraints around the today and calendar content, retained shell-owned bottom clearance, and moved the mobile “其他” calendar control above the bottom navigation. Verified no horizontal overflow and that the last expanded today row clears the mobile nav.
- **T6:** Added localized page headings and corrected the route metadata titles: `/today` is `今日`/`Today`, and `/calendar` is `行事曆`/`Calendar`. The route-table audit found no other today/calendar title swap.
- **C3:** Added an initial week-view scroll effect in `Calendar.tsx`. It positions the existing scroll container around the current daytime window (bounded to 06:00–18:00) while leaving the complete 00:00–23:00 grid reachable. The timetable grid itself was not changed.
- **Widgets:** Migrated the alternate dashboard onto `PageShell`, `PageHeader`, `Section`, `EmptyState`, and `Skeleton`; localized its labels, empty/loading states, and widget actions; removed its duplicate upcoming subsection; and retained the existing widget types, ordering, drag, and local-storage behavior.

## Dictionary changes

Added matching keys to both `zh.json` and `en.json` for page titles, isolated/range no-class rows and disclosure labels, calendar range empty states, and widget labels/loading/empty copy. The key-tree check reports 1,317 keys in each dictionary with identical trees.

## Design-language notes

No rule in `LANGUAGE.md` proved impractical. The task’s weather exception needs context in the calendar rail: forecasts commonly exist for every day, which would make the requested rail collapse impossible if weather alone blocked grouping. The rail therefore groups by event emptiness, and its expanded rows retain their weather; the today content column treats available weather as meaningful content and does not collapse that day. This preserves reachability while allowing C1 to remove the repeated empty rail treatment.

No new shared primitive was created. The consecutive-day grouping helper is shared from `useUpcomingEvents.ts`; it could be promoted into a general date-list utility if another surface needs the same behavior.

## Left undone

- Existing unrelated hardcoded-color findings in untouched calendar/timetable components remain outside this task’s changes.
- The project’s existing type errors remain: one shops response error, three `GenericIssueFormDialog` unknown errors, three `IssueFormDialog` unknown errors, and the `worker.ts` `CacheStorage.default` error. The pre-edit and post-edit `bunx tsc --noEmit` outputs are identical; no task-file error was added.
- Runtime API requests can still log the app’s existing development warnings/errors when data is unavailable. The page-level checks completed successfully with the available empty states.

## Verification

- `cd apps/web && bunx tsc --noEmit`: eight pre-existing errors only, unchanged.
- `bun run design-lint`: passed; no new violations.
- `git diff --check`: passed.
- Dictionary key-tree comparison: passed.
- Browser checks at 1440×900 and 390×844, light and dark: `/zh/today`, `/zh/calendar`, and the widget-dashboard flag. Confirmed no horizontal overflow, mobile bottom-nav clearance, desktop width use, daytime calendar scroll position, and visible keyboard focus rings on the disclosure control.
