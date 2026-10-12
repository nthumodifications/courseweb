# Issue 946: Widget crash isolation

Survey (rejected query / malformed or empty response behavior):

| Widget           | Current behavior                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| schedule         | Ignores hook error; empty courses show `No Classes Today`.                                                                       |
| weather          | Loading/unavailable branches; no query-error branch; null/undefined or unusable-date forecast rows are dropped before rendering. |
| pinned-apps      | Local settings only; empty pinned-apps state.                                                                                    |
| notepad          | Local storage only; no loading/error/empty branch.                                                                               |
| countdown        | Ignores upcoming-event error; static-semester/no-data state.                                                                     |
| course-selection | Hook error shows `common.load_error`; parser handles empty periods.                                                              |
| bus              | Loading/no-departures only; query errors and malformed nested data can throw.                                                    |
| library          | Validates response; error or empty rows have separate existing states.                                                           |
| laundry          | Decoder drops malformed frames; connection error state, no retry control.                                                        |
| sports-venues    | Non-array becomes empty; rejected query/error and empty states exist.                                                            |
| youbike          | Fetch fallback; rejected query/error and no-pinned-stations states exist.                                                        |
| shops            | Rejected query/error state; raw malformed shape can throw in `flatMap`/schedule access.                                          |
| upcoming-events  | Hook error with no events gets error state; otherwise empty state.                                                               |
| grades           | Normalizes local data; sync loading/error/empty states exist.                                                                    |

Built: `WidgetErrorBoundary` wraps each `WidgetGrid` slot, preserves title, remove, drag props, and resets on id/type change; it calls `recordClientError` without recording content. Fallback copies `UpcomingEventsWidget.tsx:49-53` (Calendar, classes, and `common.load_error`); no retry was added because no existing widget error state has one.

Weather filters null/undefined and unusable-date forecast rows before mapping; the regression test proves `[valid, null]` renders exactly one column. Existing screens and states were otherwise untouched. No new dictionary strings, settings moves, widgets, storage, or sync changes.

Tests: `bun run type-check` clean; `bun run test` = 776 pass, 1 skip, 0 fail (777 tests); touched-file Prettier check clean; en/zh key trees identical (2,217 leaves each).

Design-lint before/after: identical 455 summary findings (40 hardcoded-color, 60 dark-color, 0 large-type, 16 overlay-shadow, 20 centered-layout, 0 reading-column, 14 cjk-hostile, 67 synthetic-weight, 238 spacing-vocab). Command remains baseline-failing on pre-existing findings, including `WeatherForecast.tsx:66 gap-0.5`; no new Widget boundary finding.

Left out: no retry UI, widget restyling, malformed-source refactors, new widgets, settings moves, or dashboard storage changes.

Force locally: set `localStorage.use_widget_dashboard = true`, temporarily add `throw new Error("local widget test");` as the first statement in `WeatherWidget`, reload, and inspect the Weather fallback; remove the temporary line afterward. The failed slot remains removable/reorderable while siblings stay live.

Fix round (type | icon | source; titles: 14/14 verified, bus uses its default no-city-pin title; counts: 14 types, 12 icons, 2 no-icon, 1 unknown-type guard)
schedule | Calendar | `ScheduleWidget.tsx:57`
weather | Cloud | `WeatherWidget.tsx:56`
pinned-apps | LayoutGrid | `PinnedAppsWidget.tsx:59`
notepad | none | `NotepadWidget.tsx:24-41` (no associated icon)
countdown | Timer | `CountdownWidget.tsx:148`
course-selection | none | `CourseSelectionWidget.tsx:36-46` (no associated icon)
bus | Bus | `BusWidget.tsx:229`
library | BookOpen | `LibraryWidget.tsx:111`
laundry | WashingMachine | `LaundryWidget.tsx:142`
sports-venues | Dumbbell | `SportsVenuesWidget.tsx:79`
youbike | Bike | `YouBikeWidget.tsx:91`
shops | Store | `ShopsWidget.tsx:113`
upcoming-events | Calendar | `UpcomingEventsWidget.tsx:51`
grades | BookOpen | `GradesWidget.tsx:106`
