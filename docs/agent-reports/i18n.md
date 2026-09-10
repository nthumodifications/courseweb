# Deep i18n / translation audit

Audit date: 2026-09-10. Scope: 303 `.tsx`/`.ts` files under `apps/web/src/{components,app,features,layouts,hooks,helpers,pages}`.

## Counts

| Measure | Count | Notes |
|---|---:|---|
| Static user-visible candidates in baseline | 1,116 | AST sweep of JSX text, accessibility attributes, toast/error literals, and textual `date-fns` formats at `HEAD` (`ce09dd0b`). |
| Candidates fixed | 349 | Baseline candidates minus the current sweep. This is a conservative static count; it includes repeated literals and a few non-rendered error/invariant strings. |
| Candidates remaining | 767 | Listed in the residual table below, grouped by file so every scanner result remains searchable. |
| Dictionary drift: `en.json` vs `zh.json` | 0 | Both have 1,009 leaves and identical key trees. |
| Confirmed code references to missing dictionary leaves | 0 | The four `planner.lib.status` results are parameter names in a plain helper interface, not dictionary references. |
| Possible/dead dictionary leaves | 68 | Static reference analysis; retained as requested. Dynamic access and aliases make this a candidate list, not a deletion list. |
| Existing zh values corrected | 123 | Simplified characters, mainland vocabulary, punctuation, awkward wording, and NTHU/Taiwan terminology. |
| New paired dictionary leaves | 312 | Added to both dictionaries with separate English and zh-TW text. |
| TypeScript errors | 8 | Exact pre-existing baseline count; no new errors added. |

The hardcoded-string counts are from the temporary TypeScript AST audit used during this work. It intentionally does not treat identifiers, class names, console logs, pure numeric/date-mask values, or design-system examples as user-visible findings. The residual rows below are the complete grouped output of the same sweep, including items deliberately deferred.

## Audit table

### Dictionary parity and references

| File | Line | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `apps/web/src/dictionaries/en.json`, `zh.json` | — | Dictionary drift | 1,009 leaves in each; no missing counterpart keys | Keep trees identical; all 312 additions were made as paired entries | Yes |
| `apps/web/src/app/[lang]/(mods-pages)/student/planner/lib/status.tsx` | interface `PlannerStatusDict` | False-positive missing references | `completed`, `inProgress`, `failed`, `planned` are function-parameter properties, not `useDictionary()` properties | No change; no dictionary key is needed | N/A |
| `apps/web/src/dictionaries/*.json` | — | Possible dead keys | 68 leaves have no statically detected direct reference; full list is below | Retain and review when parallel feature work lands; do not delete | No |

Possible/dead candidates: `today.noclass_reminder.first`, `today.noclass_reminder.choose_courses`, `today.noclass_reminder.then`, `today.noclass_reminder.timetable`, `today.noclass_reminder.check_schedule`, `timetable.actions.more_options`, `timetable.actions.sync_ccxp`, `course.list.courses`, `course.list.found`, `course.refine.specialization`, `course.refine.class`, `course.refine.extra_selection`, `course.refine.x-class`, `course.refine.16_weeks`, `course.refine.others`, `course.refine.clear`, `course.details.language`, `course.details.reserved`, `course.details.capacity`, `course.details.venue_time`, `course.details.class`, `course.details.cross_discipline`, `course.details.view_ccxp_syllabus`, `navigation.courses`, `navigation.venues`, `bus.nanda_line`, `bus.validity`, `bus.route`, `bus.departure_time`, `bus.notes`, `settings.appearance.preset.description`, `settings.appearance.radius.description`, `settings.appearance.font_scale.description`, `settings.account.title`, `settings.account.description`, `settings.account.ccxp.title`, `settings.account.ccxp.description`, `settings.timetable.display`, `campus_map.title`, `applist.to_ccxp`, `shops.closed`, `shops.closed_today`, `help.tools.connect`, `help.prev`, `help.next`, `help.jump`, `ccxp.connected`, `ccxp.failed`, `ccxp.incorrect_credentials`, `ccxp.studentid`, `ccxp.password`, `ccxp.fill_in_ccxp_credentials`, `ccxp.login.title`, `ccxp.login.disclaimer`, `ccxp.login.description`, `ccxp.login.agree`, `ccxp.errors.IncorrectCredentials`, `ccxp.errors.CaptchaError`, `ccxp.errors.UnknownError`, `ccxp.logging_in_please_wait`, `ccxp.not_logged_in_error`, `cancel`, `privacy_policy`, `common.close`, `common.submit`, `common.save`, `common.share`, `sponsorship.description`.

### zh-TW quality corrections

| File | Line | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `apps/web/src/dictionaries/zh.json` | multiple | Simplified characters | `顔`, `備注`, `賬號`, `後台`, `導入`, `啓動`, `點擊`, `創建`, `模板`, `計劃`, `生成`, `查看`, `替換`, `網絡`, `用戶`, `身份`, `存儲`, `服務器`, `信息`, `開啓`, `鏈接`, `會話` and related forms | Traditional forms and Taiwan usage: `顏`, `備註`, `帳號`, `後臺`, `匯入`, `開始`, `點選`, `建立`, `範本`, `規劃`, `產生`, `檢視`, `取代`, `網路`, `使用者`, `身分`, `儲存`, `伺服器`, `資訊`, `開啟`, `連結`, `工作階段` | Yes; 123 existing values corrected |
| `apps/web/src/dictionaries/zh.json` | multiple | Taiwan terminology | Course-code labels and generic translations varied between `課程代碼`/`課程列表`/`國語` and mainland-style wording | Standardized user-facing terms around `課號`, `課程清單`, `中文`, `學分`, `系所`, `校車`, `行事曆`, `導覽`, `連線`, and `使用者` where the meaning was clear | Yes |
| `apps/web/src/dictionaries/zh.json` | multiple | Awkward/machine-like wording | Mixed English fragments, unnatural reminders, and literal UI wording in timetable, planner, settings, help, error, and download strings | Rephrased for natural Taiwan Traditional Chinese; retained product names, acronyms, technical formats, and URLs | Yes |
| `apps/web/src/dictionaries/zh.json` | multiple | Untranslated zh values | English fragments in settings, calendar, error/auth, planner, timetable, sports, footer, and help namespaces | Added or translated zh-TW counterparts rather than copying English | Yes |
| `apps/web/src/dictionaries/zh.json` | multiple | Quality verification | Targeted scan of requested mainland terms after edits found no prohibited term occurrences; remaining `程序` means a software process and `產生` is the Traditional form of “generate” | No further automatic replacement; these are contextually correct | Yes |

### Hardcoded candidates fixed

These rows group all mechanical source fixes by file/feature. Exact residual literals that were not safely movable into a hook are listed in the next table.

| File / area | Line | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `components/Chat/*`, `app/[lang]/(mods-pages)/chat/ChatPageContent.tsx` | multiple | JSX, placeholders, errors | AI title, welcome text, context labels, suggestions, send/clear/input/loading, renderer empty/error states | Added `chat.*`/`common.*` keys and read them through `useDictionary()` | Yes |
| `components/Courses/*`, course filter pages | multiple | JSX, placeholders | Search, no-results, selecting/all, semester suffix, time-filter mode and controls | Added/reused `course.*`/`common.*` keys | Yes |
| Course details components | multiple | JSX, toasts, placeholders, PDF/share/review text | Course not-found, venue/time labels, contribution/download/share/review UI | Added `course.details.*` and dialog keys; `DateContributeForm` date display now uses the active date-fns locale | Yes |
| Calendar components | multiple | JSX, form labels/options, toasts, date formats | Event form, picker, popover, sync, other-timetable, tabs, empty/error states | Added `calendar.*`/`common.*` keys; visible date-fns formats now use `getLocale()` | Yes |
| `components/Timetable/DownloadTimetableDialog.tsx` | multiple | toasts, alt/title, locale | Export/copy feedback and image labels; hardcoded `zh-TW` date locale | Dictionary-backed labels and `language === "en" ? "en-US" : "zh-TW"` | Yes |
| `components/Timetable/Timetable.tsx`, `TimetableDayCards.tsx`, `TimetableTimeline.tsx`, `TimetableAgenda.tsx` | multiple | weekday labels/date locale | English weekday abbreviations and English date-fns locale | Generate labels from active locale; dictionary-backed Saturday/no-course text | Yes |
| Timetable sidebar/item drawer | multiple | JSX, aria-labels, controls | Group/member/community/customization and course actions | Added `timetable.*`/`settings.*` keys | Yes |
| `app/[lang]/(mods-pages)/sports-venues/page.tsx` | multiple | JSX, badges, errors, date/time | Sports status, schedule, source and occupancy labels | Added `sports.*`; update time uses active locale | Yes |
| Grades charts/viewer | multiple | chart tooltip/header labels | GPA, rank, grade, semester, credits, general-education labels | Added `grade.*` and `course.tags.general_education` | Yes |
| Planner course picker/settings pages | multiple | JSX, labels, errors, date locale | Course credits/similarity, planner status text, semester labels, loading/error text | Added/reused planner/common keys; visible semester dates use active locale | Yes |
| Shops, venues, bus pages | multiple | loading/error/search/status text | Search, loading, API/route errors, bus schedule labels | Added `shops.*`, `bus.*`, `common.*`; route language is normalized | Yes |
| Settings sections | multiple | labels, options, aria-labels | Theme, radius, font scale, navigation, timetable alignment/fields, language options | Added paired settings keys and dictionary-backed controls | Yes |
| Loading/error/offline/auth/waitlist/CCXP pages | multiple | page text, errors | Generic loading, offline, auth callback, route errors, CCXP suspension, waitlist | Added `common.*`, `error.*`, `auth.*`, `pages.*`, `ccxp.*` keys | Yes |
| `components/Footer.tsx`, `Help/*`, `Header.tsx`, `SearchBox/SearchBox.tsx`, `Forms/LoginDialog.tsx` | multiple | JSX/aria/title | Footer, help image/button, logout, search title, coming-soon text | Dictionary-backed UI and normalized route language | Yes |

### Remaining hardcoded candidates

The following is the complete grouped residual output (`767` candidates). “Deferred” means the literal is still present. Proposed fixes are intentionally not implemented where moving it would require a component/API restructure, legal/content review, or a parallel agent’s logic area. Technical errors and protocol/product names are included because the scanner found them, but are not necessarily user-visible.

| File | Line(s) | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `components/AppSidebar.tsx` | 38 | JSX | `Testing` | Add a sidebar dictionary key if this route is user-facing | No; likely dev/test label |
| `components/Calendar/EventForm.tsx` | 574 | form error | `end` | Localize only if this is rendered as an error label; currently a field name | No; field identifier |
| `components/Chat/ChatProvider.tsx` | 33 | Error | `useChatContext must be used within ChatProvider` | Keep as developer invariant or use an internal error catalog | No; dev-only invariant |
| `components/CommandPalette/CommandPalette.tsx` | 244, 247, 250 | JSX | `navigate`, `select`, `Esc`, `close` | Localize keyboard-help labels if product wants translated shortcuts | No; compact command hints / key names |
| `components/CourseDetails/DateContributeForm.tsx` | 83 | Error | `Failed to fetch dates` | Use a dictionary-backed user-facing fetch error | No; plain function error path needs refactor |
| `components/CourseDetails/ShortNameContributeForm.tsx` | 10, 20, 22, 27, 29, 30 | JSX/placeholder | `Contribute Short Name`; `Enter only accurate and relevant information!`; `Your submission will contain your Student ID, and will be publicly visible.`; `Short Name`; `Cancel`; `Submit` | Move form copy into both dictionaries and add `useDictionary()` | No; requires form/content review |
| `components/CourseDetails/StructuredComment.tsx` | 64–136 | JSX/placeholder | `有點名`; `有考古`; `加簽`; `是/否，補充~`; `建議先修課程`; `上課方式`; `給分`; `考試作業型態`; `老師的喜好、個性`; `補充` | Add structured-comment field labels/placeholders under a reviewed course-details namespace | No; no existing stable namespace and semantics need review |
| `components/CourseDetails/SyllabusSummary.tsx` | 82–147 | JSX | `AI 摘要`; `分析課程內容中…`; `重試`; `AI 課程摘要`; `負擔`; `難度` | Add syllabus-summary dictionary keys and translate both locales | No; component copy needs coordinated review |
| `components/Courses/CourseDialog.tsx` | 136 | Error | `useCourseLink must be used within CourseDialogProvider` | Keep as developer invariant | No; dev-only invariant |
| `components/Footer.tsx` | 66 | JSX | `NTHUMods.` | Keep brand string | No; product name |
| `components/Forms/GenericIssueFormDialog.tsx` | 152–397 | toast/JSX/placeholder | `Verification Required`; `Please complete the verification to prove you're not a bot`; `Validation Error`; title/description validation; `Please Provide Details`; `Issue Submitted Successfully`; feedback copy; `Whats the feature/bug you're facing` | Add issue-form validation, success, and field keys; use dictionary in the dialog | No; requires form restructuring and duplicated logic review |
| `components/Forms/IssueFormDialog.tsx` | 133–359 | toast/placeholder | Same validation/success/details/placeholder family as above | Share/reuse a reviewed issue-form namespace | No; same restructuring concern |
| `components/Help/Help.tsx` | 183–270 | JSX | Room names, sample dates, `今天`, `明天`, course names | Localize only if these are intended as instructional prose; preserve sample NTHU data | No; illustrative animation content |
| `components/Portal/HeaderPortal.tsx` | 46 | Error | `useHeaderPortal must be used within a HeaderPortalProvider` | Keep as developer invariant | No |
| `components/PWA/PWAInstallPrompt.tsx` | 125–187 | JSX | Safari/browser installation instructions, `Install`, `Install NTHUMods`, home-screen description | Add platform-specific PWA keys and use `useDictionary()` | No; requires a larger copy/platform review |
| `components/Static/TeamContainer.tsx` | 4–10 | JSX | Traditional Chinese team paragraph, `團隊`, `NTHUMods Core` | Put static team copy in locale dictionaries or a localized content model | No; static page content needs editorial review |
| `components/Timetable/SemesterSwitcher.tsx` | 38 | JSX | `學期` | Reuse `course.refine.semester` or a timetable key | No; tiny protected-area follow-up |
| `components/Timetable/ShareSyncTimetableDialog.tsx` | 64–138 | toast/aria/JSX | Short-link error/copy messages, `Link`, `Sync To Calendar` | Add share-sync keys and use `useDictionary()` | No; protected timetable dialog, string-only follow-up |
| `components/Timetable/ShareTimetableDialog.tsx` | 99–763 | JSX/placeholders/toasts | Live/snapshot/public/delete/save/group/name/nickname/semester/share-link/course-note/grade/difficulty/attendance copy | Add a complete share-timetable namespace and translate both dictionaries | No; large protected component and parallel work risk |
| `components/Timetable/TimetableAgenda.tsx` | 141 | JSX | `cr` | Use the course-credit dictionary suffix if it is user-visible | No; compact unit may be data presentation |
| `components/Timetable/TimetableSlotHorizontal.tsx` | 109 | JSX | `cr` | Use the course-credit dictionary suffix | No; protected slot component |
| `components/Timetable/TimetableSlotVertical.tsx` | 102 | JSX | `cr` | Use the course-credit dictionary suffix | No; protected slot component |
| `components/components/ui/form.tsx` | 50 | Error | `useFormField should be used within <FormField>` | Keep as developer invariant | No |
| `components/Widgets/WidgetShell.tsx` | 38, 51 | aria-label | `Drag to reorder`; `Remove widget` | Add widget accessibility keys | No; protected Widgets area |
| `app/error.tsx` | 72–104 | JSX | `Github`; `IG` | Keep external brand/service labels | No |
| `app/[lang]/(mods-pages)/(side-pages)/contribute/page.tsx` | 50–87 | alt/JSX | `Algolia`; `Cerana Studios`; `19k+` | Keep brand names and metric; localize only surrounding copy if product wants it | No; names/data |
| `app/[lang]/(mods-pages)/(side-pages)/issues/EmptyIssueForm.tsx` | 19–56 | setError/JSX | Required-title/description errors, failed-submit error, success, `Submit` | Add issue form dictionary keys and hook | No; form restructuring |
| `app/[lang]/(mods-pages)/(side-pages)/issues/page.tsx` | 32–68 | JSX/URLs | Report-issue explanatory copy, source names, and public URLs | Localize explanatory copy while preserving URLs and source names | No; static/content/legal review |
| `app/[lang]/(mods-pages)/(side-pages)/next-steps/page.tsx` | 8–97 | JSX | Full Chinese and English proxy-login termination announcement | Move the bilingual announcement into reviewed localized content | No; policy/announcement content requires editorial/legal approval |
| `app/[lang]/(mods-pages)/(side-pages)/privacy-policy/page.tsx` | 8–182 | JSX | Full Chinese and English privacy policy | Keep as reviewed legal content or migrate through a legal-content localization workflow | No; must not mechanically rewrite legal text |
| `app/[lang]/(mods-pages)/(side-pages)/proxy-login/page.tsx` | 26–305 | JSX | Full Chinese and English proxy-login documentation | Migrate to localized content after technical/legal review | No; large policy/documentation page |
| `app/[lang]/(mods-pages)/(side-pages)/team/page.tsx` | 16–99 | JSX | English team page copy, names, `Github`, `Core Team`, `Dedicated Members` | Add reviewed localized page content | No; editorial/static page |
| `app/[lang]/(mods-pages)/apps/AppItem.tsx`, `apps/page.tsx` | 33, 47 | JSX | `BETA` | Add app-status dictionary key if status is translated | No; conventional product badge |
| `app/[lang]/(mods-pages)/community/page.tsx` | 75–317 | JSX/placeholder | `courses`; Live/Snapshot; more; grade; full-page/community-timetable copy; all-semesters; empty state; Previous | Add community timetable namespace and translate the whole flow | No; large feature flow |
| `app/[lang]/(mods-pages)/courses/FavouritesCourseList.tsx` | 160 | Error | `No data` | Use a common/course empty-data key | No; plain fetch error path |
| `app/[lang]/(mods-pages)/courses/SearchContainer.tsx` | 226, 230 | JSX/title | `ms)`; `Algolia` | Preserve timing suffix as data; preserve provider name | No; non-copy/provider text |
| `app/[lang]/(mods-pages)/group/[code]/page.tsx` | 98–352 | Error/toast/JSX/placeholder | Group name/join/leave/delete/copy/member/course flows and errors | Add group namespace and translate all states consistently | No; large flow requires coordinated copy |
| `app/[lang]/(mods-pages)/settings/page.tsx` | 367 | placeholder | `/* Your custom CSS here */ .example { color: red; }` | Keep as code example; not a natural-language UI string | No |
| `app/[lang]/(mods-pages)/settings/WidgetSection.tsx` | 119, 135 | JSX | `Columns / 欄數`; `Widgets / 小工具` | Add widget-section keys | No; protected Widgets area |
| `app/[lang]/(mods-pages)/shops/page.tsx` | 12 | Error | `Failed to fetch data from the NTHUSA API` | Use shops API error key | No; plain error path needs hook |
| `app/[lang]/(mods-pages)/shops/ShopItem.tsx` | 349 | JSX | `無` | Use a shop/no-data dictionary key if the value is rendered as a status | No; tiny follow-up |
| `app/[lang]/(mods-pages)/sports-venues/page.tsx` | 408 | Error | `Failed to fetch occupancy data` | Use sports occupancy error key | No; plain error path needs hook |
| `app/[lang]/(mods-pages)/student/planner/course-picker/PlannerSearchContainer.tsx` | 136 | JSX | `ms)` | Preserve timing suffix as data | No |
| `app/[lang]/(mods-pages)/student/planner/data/planner.ts` | 32, 44 | Error | `Planner data already exists`; `Planner data not found` | Add planner data error keys or pass dictionary into this data helper | No; plain function cannot use hook |
| `app/[lang]/(mods-pages)/student/planner/folder-management.tsx` | 486, 736 | Error/aria-label | `Invalid template file format`; `file` | Add planner import/accessibility keys | No; larger import flow |
| `app/[lang]/(mods-pages)/student/planner/planner-settings.tsx` | 332, 733 | Error/aria-label | `Invalid import data format`; `json` | Add planner import/accessibility keys | No; larger import flow |
| `app/[lang]/(mods-pages)/timetable/share/[shareId]/page.tsx` | 98–312 | toast/JSX | Shared-link save/import/anonymous/live/snapshot/public/course/credit/grade/difficulty copy | Add shared-timetable namespace and translate both locales | No; large protected flow |
| `app/[lang]/(mods-pages)/timetable/view/page.tsx` | 68 | Error | `No data` | Use common/course empty-data key | No; plain error path |
| `features/campusMap/data.ts` | 28 | Error | `Campus map data has an unsupported format` | Pass a localized error from the caller or retain as internal data validation | No; plain helper cannot use hook |
| `layouts/OAuthCallbackRedirect.tsx`, `layouts/ShortlinkRedirect.tsx` | 22, 15 | JSX | `Redirecting...` | Add a callback/redirect key and pass dictionary into the layout | No; component is outside the language route context |
| `hooks/contexts/useUserTimetable.tsx` | 201, 259, 293, 334 | Error | `No data`; `Invalid courseID` | Return typed error codes and translate at render sites | No; hook/data contract restructuring |
| `hooks/useAIChat.tsx` | 256, 259, 283 | Error | Existing zh login/permission errors; `No response body` | Return error codes/localize in the consuming component | No; hook has no dictionary access |

### Locale-formatting audit

| File | Line | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `apps/web/src/helpers/dateLocale.ts` | multiple | date-fns locale | zh relative-date pattern contained English `last`/`at` literals | Use the zh-TW pattern `上週 eeee p` | Yes |
| `apps/web/src/components/Calendar/*` | multiple | date-fns locale | Calendar date/weekday formats used default or English locale at several call sites | Thread `getLocale()` from settings through visible date formats | Yes |
| `apps/web/src/components/Timetable/*` | multiple | date-fns locale | Weekday labels were English abbreviations or formatted without active locale | Generate labels with active locale; numeric masks remain locale-independent | Yes |
| `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` | multiple | `Intl` locale | Export timestamp used hardcoded `zh-TW` | Select `en-US` for English and `zh-TW` otherwise | Yes |
| `apps/web/src/app/[lang]/(mods-pages)/sports-venues/page.tsx` | multiple | `Intl` locale | Update time used a fixed locale | Select the active language locale | Yes |
| `apps/web/src/app/[lang]/(mods-pages)/student/planner/semester-management.tsx` | multiple | `Intl` locale | Semester dates used a fixed locale | Select `en-US` for English and `zh-TW` otherwise | Yes |
| `apps/web/src/**` | audit | `Intl`/date-fns search | No remaining unconditional `en-US`, `en`, or English date-fns locale was found in an active-language display path | Keep conditional locale selection; numeric masks such as `yyyy-MM-dd`, `HH:mm`, and `d` are not language text | Yes |

### Language plumbing and SEO

| File | Line | Category | Current text | Proposed fix | Fixed? |
|---|---:|---|---|---|---|
| `apps/web/src/layouts/LangLayout.tsx` | multiple | Unknown `lang` segment | Invalid language segments could be retained in the route | Strip the invalid first segment, preserve nested path/query/hash, and redirect to preferred `en` or default `zh` | Yes |
| `apps/web/src/hooks/contexts/settings.tsx`, `useAuth.tsx`, `hooks/useLaunchApp.tsx` | multiple | Language fallback | Raw route language was cast or compared inconsistently | Normalize exactly: `en` is English; every other value is zh-TW | Yes |
| `apps/web/src/layouts/MainLayout.tsx`, `components/Footer.tsx`, timetable pages | multiple | Route language propagation | Child navigation could receive an unchecked language segment | Pass normalized `en`/`zh` values | Yes |
| `apps/web/src/components/SEOHead.tsx` | multiple | HTML/OG locale | HTML and Open Graph locale could reflect an arbitrary route segment | Emit `lang="en"`/`en_US` for English and `lang="zh-TW"`/`zh_TW` otherwise | Yes |
| `apps/web/src/router.tsx` | route metadata | SEO title variants | Several `titleZh` values were missing Taiwan wording or used `日曆`/`功能列表` | Added/fixed Traditional titles such as `今日`, `行事曆`, `功能清單`, `分享的課表`, and `課表群組` | Yes |
| `apps/web/src/router.tsx`, `components/SEOHead.tsx` | route metadata | Default route | Root redirect already used cookie/browser preference with zh fallback; unknown segments now normalize through `LangLayout` | Preserve zh as the default locale | Yes |

## File-by-file changes

One line per changed file; all changes are translation coverage, zh-TW quality, locale formatting, or language plumbing.

- `apps/web/src/app/[lang]/(mods-pages)/(venues)/venues/page.tsx` — localized loading/back text and venue semester wording.
- `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/BusDetailsContainer.tsx` — localized route status and active-locale date/time formatting.
- `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/[line]/page.tsx` — localized invalid-line error.
- `apps/web/src/app/[lang]/(mods-pages)/bus/[route]/page.tsx` — localized route loading/error text.
- `apps/web/src/app/[lang]/(mods-pages)/bus/page.tsx` — localized bus-page error text.
- `apps/web/src/app/[lang]/(mods-pages)/chat/ChatPageContent.tsx` — localized chat loading/title/capabilities/login prompt.
- `apps/web/src/app/[lang]/(mods-pages)/courses/ClasssRefinementItem.tsx` — localized refinement controls.
- `apps/web/src/app/[lang]/(mods-pages)/courses/FavouritesCourseList.tsx` — localized course/empty-state labels.
- `apps/web/src/app/[lang]/(mods-pages)/courses/FilterItem.tsx` — localized filter controls.
- `apps/web/src/app/[lang]/(mods-pages)/courses/Filters.tsx` — localized time/filter placeholders.
- `apps/web/src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx` — localized search error/no-more-results.
- `apps/web/src/app/[lang]/(mods-pages)/courses/SemesterSelector.tsx` — localized semester filter text.
- `apps/web/src/app/[lang]/(mods-pages)/courses/TimeSelectionFilter.tsx` — localized time-selection UI.
- `apps/web/src/app/[lang]/(mods-pages)/courses/TimeslotFilterItem.tsx` — localized timeslot controls.
- `apps/web/src/app/[lang]/(mods-pages)/courses/[courseId]/page.tsx` — localized course-page loading text.
- `apps/web/src/app/[lang]/(mods-pages)/error.tsx` — localized route error page.
- `apps/web/src/app/[lang]/(mods-pages)/offline/page.tsx` — localized offline page.
- `apps/web/src/app/[lang]/(mods-pages)/settings/AIPreferences.tsx` — localized department loading state.
- `apps/web/src/app/[lang]/(mods-pages)/settings/BottomNavSection.tsx` — dictionary-backed navigation labels/help.
- `apps/web/src/app/[lang]/(mods-pages)/settings/MobileQuickNav.tsx` — localized accessibility labels.
- `apps/web/src/app/[lang]/(mods-pages)/settings/SettingsSidebar.tsx` — localized settings navigation aria text.
- `apps/web/src/app/[lang]/(mods-pages)/settings/SidebarNavSection.tsx` — dictionary-backed navigation labels/help.
- `apps/web/src/app/[lang]/(mods-pages)/settings/ThemeSection.tsx` — localized appearance controls.
- `apps/web/src/app/[lang]/(mods-pages)/settings/TimetablePreferences.tsx` — localized timetable settings labels/options.
- `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx` — localized language options.
- `apps/web/src/app/[lang]/(mods-pages)/shops/ShopList.tsx` — localized shop search/results/status.
- `apps/web/src/app/[lang]/(mods-pages)/shops/page.tsx` — localized shop loading/error.
- `apps/web/src/app/[lang]/(mods-pages)/sports-venues/page.tsx` — localized sports status/schedule/source/occupancy.
- `apps/web/src/app/[lang]/(mods-pages)/student/grades/ClassRankChart.tsx` — localized class-rank chart labels.
- `apps/web/src/app/[lang]/(mods-pages)/student/grades/DeptRankChart.tsx` — localized department-rank chart labels.
- `apps/web/src/app/[lang]/(mods-pages)/student/grades/GPAChart.tsx` — localized GPA chart labels.
- `apps/web/src/app/[lang]/(mods-pages)/student/grades/GradesViewer.tsx` — localized grade viewer headings/labels.
- `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/PlannerCourseListItem.tsx` — localized planner course labels.
- `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/SemesterSelector.tsx` — localized semester suffix.
- `apps/web/src/app/[lang]/(mods-pages)/student/planner/course-picker/container.tsx` — localized credits/similar-course text.
- `apps/web/src/app/[lang]/(mods-pages)/student/planner/semester-management.tsx` — localized planner controls and active-locale dates.
- `apps/web/src/app/[lang]/(mods-pages)/timetable/view/page.tsx` — localized timetable view UI and normalized route language.
- `apps/web/src/app/[lang]/error.tsx` — localized language-route error page.
- `apps/web/src/app/[lang]/waitlist/page.tsx` — localized waitlist page and removed visible stub text.
- `apps/web/src/app/auth/callback/page.tsx` — localized auth callback states.
- `apps/web/src/app/error.tsx` — localized root error page and normalized language.
- `apps/web/src/components/AI/ChatExample.tsx` — localized chat examples/context/history labels.
- `apps/web/src/components/CCXPDownAlert.tsx` — localized CCXP suspension alert.
- `apps/web/src/components/Calendar/Calendar.tsx` — localized calendar errors/sync cancellation.
- `apps/web/src/components/Calendar/CalendarDateSelector.tsx` — active-locale month/year display.
- `apps/web/src/components/Calendar/CalendarMonthContainer.tsx` — active-locale weekday/event display.
- `apps/web/src/components/Calendar/CalendarPage.tsx` — localized calendar tabs.
- `apps/web/src/components/Calendar/CalendarTimetableSyncDialog.tsx` — localized sync dialog.
- `apps/web/src/components/Calendar/CalendarWeekContainer.tsx` — active-locale week/date display.
- `apps/web/src/components/Calendar/EventForm.tsx` — localized event form and active-locale dates.
- `apps/web/src/components/Calendar/EventLabelPicker.tsx` — localized event-label picker.
- `apps/web/src/components/Calendar/EventPopover.tsx` — localized event actions/dialogs.
- `apps/web/src/components/Calendar/OthersTimetablePanel.tsx` — localized saved/other timetable panel.
- `apps/web/src/components/Calendar/UpcomingEvents.tsx` — active-locale dates and localized update state.
- `apps/web/src/components/Chat/ChatContainer.tsx` — localized chat shell/title/loading.
- `apps/web/src/components/Chat/ChatInput.tsx` — localized input placeholder/keyboard hint.
- `apps/web/src/components/Chat/ChatMessage.tsx` — localized thinking state.
- `apps/web/src/components/Chat/ChatSuggestions.tsx` — dictionary-backed suggestions.
- `apps/web/src/components/Chat/CourseListRenderer.tsx` — localized course renderer states/actions.
- `apps/web/src/components/Chat/TimetableRenderer.tsx` — localized timetable renderer states/actions.
- `apps/web/src/components/CourseDetails/CommentsNotSignedIn.tsx` — localized sign-in prompt.
- `apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx` — localized course details and date labels.
- `apps/web/src/components/CourseDetails/DateContributeForm.tsx` — localized contribution UI and active-locale dates.
- `apps/web/src/components/CourseDetails/DownloadSyllabus.tsx` — localized download action.
- `apps/web/src/components/CourseDetails/PDFViewer.tsx` — localized PDF error/retry UI.
- `apps/web/src/components/CourseDetails/ShareCourseButton.tsx` — localized sharing UI/toast.
- `apps/web/src/components/CourseDetails/TermsPage.tsx` — localized review terms.
- `apps/web/src/components/Courses/AutocompleteShadcn.tsx` — localized autocomplete states.
- `apps/web/src/components/Courses/CourseDialog.tsx` — localized dialog title/link label and normalized URL language.
- `apps/web/src/components/Courses/CourseListItem.tsx` — localized course status/restriction labels.
- `apps/web/src/components/Courses/CourseTagsList.tsx` — localized course tags/units.
- `apps/web/src/components/Footer.tsx` — localized footer content and normalized route language.
- `apps/web/src/components/Forms/LoginDialog.tsx` — localized coming-soon label.
- `apps/web/src/components/Header.tsx` — localized logout label.
- `apps/web/src/components/Help/Help.tsx` — localized help controls and animation labels.
- `apps/web/src/components/Help/Tools.tsx` — localized tool image alt text.
- `apps/web/src/components/Pages/AISError.tsx` — localized AI error page.
- `apps/web/src/components/Pages/AISLoading.tsx` — localized AI loading page.
- `apps/web/src/components/Pages/AISNotLoggedIn.tsx` — localized AI sign-in page.
- `apps/web/src/components/Pages/LoadingPage.tsx` — localized generic loading page.
- `apps/web/src/components/SEOHead.tsx` — normalized HTML and Open Graph locale.
- `apps/web/src/components/SearchBox/SearchBox.tsx` — localized search title.
- `apps/web/src/components/Timetable/DownloadTimetableDialog.tsx` — localized export/copy UI and active locale.
- `apps/web/src/components/Timetable/ShareTimetableDialog.tsx` — normalized route language only.
- `apps/web/src/components/Timetable/Timetable.tsx` — active-locale weekday labels.
- `apps/web/src/components/Timetable/TimetableAgenda.tsx` — active-locale weekday labels.
- `apps/web/src/components/Timetable/TimetableCourseList.tsx` — localized timetable course states/actions.
- `apps/web/src/components/Timetable/TimetableDayCards.tsx` — active-locale weekday labels and Saturday message.
- `apps/web/src/components/Timetable/TimetableItemDrawer.tsx` — localized quick-access/course actions.
- `apps/web/src/components/Timetable/TimetableSidebar.tsx` — localized sidebar/group controls.
- `apps/web/src/components/Timetable/TimetableTimeline.tsx` — active-locale weekday labels.
- `apps/web/src/components/Today/TodaySchedule.tsx` — localized weather update state.
- `apps/web/src/components/Venue/VenueList.tsx` — localized venue search title.
- `apps/web/src/dictionaries/en.json` — added 312 English leaves paired with zh-TW keys.
- `apps/web/src/dictionaries/zh.json` — added 312 zh-TW leaves and corrected 123 existing values.
- `apps/web/src/helpers/dateLocale.ts` — corrected zh relative-date wording.
- `apps/web/src/hooks/contexts/settings.tsx` — normalized route language fallback.
- `apps/web/src/hooks/contexts/useAuth.tsx` — normalized route language fallback.
- `apps/web/src/hooks/useLaunchApp.tsx` — normalized route language in launched links.
- `apps/web/src/layouts/LangLayout.tsx` — corrected invalid-language redirects.
- `apps/web/src/layouts/MainLayout.tsx` — localized loading and normalized sidebar language.
- `apps/web/src/router.tsx` — corrected Traditional route title metadata.

## Deliberately not done

- Did not delete the 68 possible dead keys; the request explicitly says to report them for parallel agents.
- Did not translate the large static/legal/announcement pages (`privacy-policy`, `proxy-login`, `next-steps`, parts of `team` and `issues`); moving their long content into dictionaries needs editorial/legal review and would create high-conflict changes.
- Did not restructure plain helpers/data hooks to obtain `useDictionary()`; residual errors in `planner/data/planner.ts`, `features/campusMap/data.ts`, `useUserTimetable.ts`, and `useAIChat.ts` need error-code-to-renderer boundaries.
- Did not complete the large community/group/share-timetable flows or issue/PWA forms; they require coordinated namespaces and component-level refactoring.
- Did not modify Timetable/Calendar/Widgets behavior. Calendar and Timetable edits were limited to strings/date locales; Widgets retains its existing accessibility strings.
- Did not translate brand names, URLs, protocol identifiers, CSS examples, room/course sample data, or developer invariants.
- Did not rename existing dictionary keys. No database schema, generated Supabase type, environment variable, dependency, or lockfile was changed.

## Manual steps / maintainer follow-up

No DB migration, env var, dependency installation, generated-type regeneration, deployment, commit, or push is required for these changes. The maintainer should review the residual tables, especially legal/static copy and the protected share/community/timetable flows, before a second translation pass. If those are approved, add their namespaces in both dictionaries and keep the current key-tree parity check.

## Validation

- `apps/web/src/dictionaries/en.json` parses; `zh.json` parses; both have 1,009 leaves and identical trees.
- Targeted zh quality scan found no requested mainland vocabulary/Simplified-character matches that needed correction; the only remaining matches are contextually correct `程序` (“process”) and Traditional `產生` (“generate”).
- Baseline AST sweep: `COUNT 1116`; final AST sweep: `COUNT 767`; delta: 349 candidates fixed.
- Dictionary reference sweep: `REFERENCED 941 OF 1009`; four reported status-property names are false positives from a non-dictionary interface; possible dead list contains 68 keys and was retained.
- `git diff --check` passed with exit code 0 after this report was added (Git emitted only its normal LF/CRLF working-copy warnings).
- Final command: `cd apps/web && bunx tsc --noEmit` exited 1 with exactly the eight pre-existing errors supplied in the brief; no new errors were reported.

### Typecheck result

Final output (8 diagnostics):

```text
src/app/[lang]/(mods-pages)/shops/page.tsx(30,20): error TS2322: Type 'unknown' is not assignable to type '{ restaurants: any[]; }[]'.
src/components/Forms/GenericIssueFormDialog.tsx(36,22): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/GenericIssueFormDialog.tsx(36,41): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/GenericIssueFormDialog.tsx(37,19): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(34,22): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(34,41): error TS18046: 'errorData' is of type 'unknown'.
src/components/Forms/IssueFormDialog.tsx(35,19): error TS18046: 'errorData' is of type 'unknown'.
worker.ts(824,26): error TS2339: Property 'default' does not exist on type 'CacheStorage'.
```

## Known residual / untested items

The residual table is not a claim that all listed strings are user-visible or incorrect: it includes static AST candidates, developer invariants, provider/brand names, data units, and plain-function errors. No browser/manual visual QA, screen-reader QA, or production locale smoke test was run. No runtime check was performed for every newly added interpolation key. The final TypeScript check and structural JSON/diff checks are the release-gate evidence for this worktree.
