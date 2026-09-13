# Today page: structured empty schedule

## Empty-week rendering

Before, on a quiet `/zh/today` week:

```text
接下來                         沒有其他安排

即將到來的行程
  接下來沒有安排

今天 9/12
  🎉 今天沒有課喔！
    放假吧~
明天 9/13
  🎉 今天沒有課喔！
    放假吧~
星期日 9/14
  🎉 今天沒有課喔！
    放假吧~
星期一 9/15
  🎉 今天沒有課喔！
    放假吧~
星期二 9/16
  🎉 今天沒有課喔！
    放假吧~

即將到來的行程
  沒有即將到來的行程
```

After, with the five-day window empty:

```text
9/12–9/16（五天）                                      沒有課
```

The day list owns the empty answer. `NextUpLine`, the titled upcoming-events
section, and the minified sidebar rail render nothing when they have no events.
The empty row is one `divide-y` list row, uses `py-4`, has no emoji or subtitle,
and is muted with `opacity-30`. A one-day run uses `今天`、`明天`、or the
localized weekday on the left; only runs of two or more days use the date range.

## Implementation notes

- Removed the vestigial `md:grid-cols-[380px_auto]`; the today page now has one
  fluid `grid-cols-1` track at every breakpoint.
- Added consecutive-day grouping to `useUpcomingEvents.ts`.
- The five day rows now include class, academic/course-date, and personal
  calendar content. The separate upcoming section is rendered only for events
  outside those five rows, preventing the same event from appearing twice.
- Weather remains header decoration and is excluded from the empty-day
  predicate.
- Removed `dict.today.noclass_sub` from both dictionaries and replaced the
  half-width-tilde copy with complete, concise localized labels.
- Replaced relevant synthetic font weights and weather gray utilities with
  supported weights/tokens. The existing `no_class` hatch colors remain data
  colors.

## Verification

- `cd apps/web && bunx tsc --noEmit`: exactly the 8 stated pre-existing errors;
  no changed-file errors.
- `cd apps/web && bun test src`: 103 passed, 0 failed.
- `bun run design-lint`: no new violations.
- `rg -n "noclass_sub" apps/web/src`: no matches.
- `git diff --check`: passed.
- Browser verification was not run: no browser automation is available in this
  environment. No claim is made for the 1440×900 / 390×844 light/dark checks.

No commit, push, or `gh` command was run.
