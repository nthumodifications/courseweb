# Settings language pass

Date: 2026-09-11

## Result

- Reworked the settings sections and setting rows to follow the bus-page list anatomy: left labels, right controls, `divide-y divide-border`, token colours, and the shared 4/8/16/24 spacing scale.
- Removed page-level reading-column constraints, explanatory subtitles that repeated the control, oversized/semibold type, hardcoded colour utilities, dark-mode overrides, and preset-name capitalization.
- Changed the timetable theme picker to an equal-tile responsive grid. Each tile is width-constrained, keeps its swatches inside an overflow-hidden strip, and uses localized preset labels.
- Added the missing localized labels for timetable themes, font choices, widget choices, move controls, and the custom CSS placeholder.
- No theme configuration or type change was required.
- Did not change the bus page, timetable components, or `packages/ui`.

## Deleted description strings

These descriptions were removed from both dictionaries because the adjacent control already communicates the setting:

| Dictionary key                                        | zh                               | en                                        |
| ----------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| `settings.appearance.description`                     | 主題、顏色、字體、版面           | Theme, Colors, Fonts, Layout              |
| `settings.appearance.preset.description`              | 選擇配色主題                     | Choose a color theme                      |
| `settings.appearance.radius.description`              | 邊框圓角大小                     | Corner roundness                          |
| `settings.appearance.font_scale.description`          | 調整文字大小                     | Adjust text size                          |
| `settings.appearance.density.description`             | 介面間距                         | UI spacing                                |
| `settings.appearance.background.description`          | 頁面背景樣式                     | Page background style                     |
| `settings.display.description`                        | 外觀，語言                       | Appearance, Language                      |
| `settings.display.compact_header.description`         | 降低頂部標頭列的高度             | Reduce the height of the top header bar   |
| `settings.timetable.description`                      | 顏色、客製化                     | Theme, Preview                            |
| `settings.privacy.description`                        | 使用量分析                       | Analytics                                 |
| `settings.calendar.description`                       | 想先看到什麼內容                 | What do you wanna see first               |
| `settings.calendar.academic_calendar.description`     | 在行事曆頁面顯示學校行事曆。     | Show Academic Calendar on the Today Page. |
| `settings.calendar.experimental_calendar.description` | 在行事曆頁面使用新的行事曆功能。 | Use the new Calendar on the Today Page.   |
| `settings.advanced.description`                       | 自訂 CSS、開發者選項             | Custom CSS, Developer Options             |

Also removed the redundant navigation drag hint `settings.drag_hint` and the redundant widget prefix `settings.calendar.widget_dashboard.customize` from both dictionaries. The copied notification was changed from `已複製！` / `Copied!` to `已複製` / `Copied` to comply with the copy rules.

Descriptions retained because they communicate a consequence or scope limit:

- `settings.ai.profile.description`: the profile improves recommendation accuracy.
- `settings.ai.api_key.description`: the API key enables higher usage limits.
- `settings.calendar.widget_dashboard.description`: widgets replace the default dashboard content.
- `settings.timetable.default_view.description`: the default view is a meaningful initial-state choice.
- `settings.privacy.analytics.description`: analytics is an explicit data-use caveat.
- `settings.advanced.custom_css.description`: custom CSS is a scope/consequence caveat.

`settings.ai.description` remains in the dictionary because it is consumed by the existing AI settings dialog outside this page; it is not rendered as a page subtitle.

## Verification

Run from the repository root unless noted.

| Check                              | Result                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cd apps/web && bunx tsc --noEmit` | 8 errors, matching the stated baseline: shops, the two issue form dialogs, and `worker.ts`; no settings errors                                                      |
| `cd apps/web && bun test src`      | 103 passed, 0 failed                                                                                                                                                |
| `bun run design-lint`              | Unavailable: the root package has no `design-lint` script                                                                                                           |
| `bun tools/design-lint/index.mjs`  | Existing repository-wide findings remain in unrelated areas; the exact `apps/web/src/app/[lang]/(mods-pages)/settings/` path produced no lint findings              |
| Browser `/zh/settings`             | Checked at 1440×900 and 390×844 in light and dark on the worktree dev server; no horizontal document overflow at either width, and the timetable tiles fit at 390px |
| `git diff --check`                 | Passed                                                                                                                                                              |

The browser session also showed existing environment warnings/errors for the Radix dialog title requirement and unavailable localhost:5001 calendar/college services. These did not prevent the settings route or the picker from rendering.

No commit, push, or deployment was performed.
