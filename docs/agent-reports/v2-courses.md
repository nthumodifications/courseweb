# v2 courses, search, venues, and map

## `useQuery` audit

The table records the state before this change. “Partial” means the query had
some custom fallback, but not the required shared, compact, retryable
`ErrorState`.

| Query key | File | Before change | After change |
| --- | --- | --- | --- |
| `venues` | `apps/web/src/app/[lang]/(mods-pages)/(venues)/venues/page.tsx` | No error branch; the sidebar fell through to the venue list | `ErrorState` with retry |
| `venue-courses` | `apps/web/src/app/[lang]/(mods-pages)/(venues)/venues/page.tsx` | No error branch; detail loading ended without an error state | `ErrorState` with retry |
| `venue-occupancy` | `apps/web/src/app/[lang]/(mods-pages)/sports-venues/page.tsx` | No error branch | `ErrorState` with retry |
| `sports-opening-times` | `apps/web/src/app/[lang]/(mods-pages)/sports-venues/page.tsx` | No error branch | `ErrorState` with retry |
| `course / syllabus` | `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx` | Partial: custom 404-style markup, no retry, and API failures could look like not-found | `ErrorState` with retry |
| `course / ptt` | `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx` | No error branch | `ErrorState` with retry |
| `course / related` | `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx` | No error branch | `ErrorState` with retry |
| `course / dates` | `apps/web/src/components/CourseDetails/DateContributeForm.tsx` | No rendered error branch; `error` was only destructured | `ErrorState` with retry |
| `courses` favourites | `apps/web/src/app/[lang]/(mods-pages)/courses/FavouritesCourseList.tsx` | No rendered error branch; `error` was unused | `ErrorState` with retry |
| `dining` | `apps/web/src/app/[lang]/(mods-pages)/shops/page.tsx` | Partial: hardcoded one-line error, no retry | `ErrorState` with retry |
| `nthu-campus-map` | `apps/web/src/features/campusMap/CampusMapPage.tsx` | Partial: centered custom message, no retry | `ErrorState` with retry |

The `useQuery` blocks in `student/id`, `student/parcel`, and `student/grades`
are commented out and are not runtime queries.

## Changes

- Course search results and venue results use dense `divide-y divide-border`
  rows with left identity, bold label, right-side answer, and navigation
  affordance.
- Course and venue empty searches use compact left-aligned `EmptyState` copy;
  course search has no description.
- Loading placeholders follow the loaded row columns for courses, venues,
  sports venues, and shops.
- Added `min-w-0` and responsive action labels to prevent horizontal overflow
  in course search and course details at narrow widths.
- Replaced assigned-area hardcoded command-palette, sports, shop, and course
  contribution copy with dictionary entries in both `zh.json` and `en.json`.
- Kept course tag and map marker data colors scoped to their data surfaces;
  ordinary UI colors use design tokens.
- The bus page and `components/Timetable/` were not changed.

## Verification

- `cd apps/web && bunx tsc --noEmit`: 7 diagnostics remain, all outside the
  changed area (6 issue-form errors and 1 worker error). The documented shops
  diagnostic was fixed, reducing the baseline from 8 to 7.
- `cd apps/web && bun test src`: 103 passed, 0 failed.
- `bun run design-lint`: passed with no new violations.
- Browser verification was not available in this environment. I did not claim
  visual checks, 390px horizontal-scroll checks, or a live blocked-API check.
