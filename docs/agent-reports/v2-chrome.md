# v2 chrome, onboarding, and Traditional Chinese typography sweep

Date: 2026-09-11

## Outcome

Completed the scoped chrome, onboarding, chat/AI, alert, PWA, static, sponsorship, changelog, form, portal, group, offline, error, and layout sweep. The onboarding copy is now short, factual, uses `NTHUMods`, and has no Chinese UI exclamation marks or emoji. Chinese/Latin and Chinese/digit spacing is complete for both dictionaries and the scoped source files; a detector reports no remaining adjacency matches.

The Calendar area, including the sidebar upcoming-events rail, was not touched because it belongs to another agent. The bus page and Timetable components were also not touched.

The Latin-first font order was already correct in `apps/web/src/app/globals.css` (`Inter` before PingFang TC / Microsoft JhengHei / Noto Sans TC). `packages/tailwind-config/base.js` referenced undefined `--font-inter` and `--font-noto` variables, so its sans stack now uses the existing Latin-first fallback stack.

Layouts are left-aligned and page-width-owned; centered reading columns, layout `text-center`, excessive type, non-token colors, dark utility overrides, inappropriate shadows, truncation, and hostile typography utilities were removed in scope. Long-form help, changelog, offline, error, and related copy uses relaxed line height. The new `tools/check-dictionary-keys.mjs` checks that the dictionary key trees remain identical.

## Verification

- `node tools/check-dictionary-keys.mjs`: passed; 1,421 keys match.
- `cd apps/web && bun test src`: passed; 103 tests, 0 failures.
- `cd apps/web && bunx tsc --noEmit`: exactly the expected 8 baseline errors remain: shops (1), the two issue form dialogs (6), and worker (1). No new TypeScript errors were added.
- `bun run design-lint`: no new violations.
- `git diff --check`: passed; Git only reported the repository's LF-to-CRLF working-copy warnings.
- Browser verification was not performed: no browser tool was available in this environment.

## Dictionary changes

Each changed key is listed below. `—` means that locale had no prior key or was unchanged.

| Key | zh before → after | en before → after |
|---|---|---|
| `settings.account.ccxp.description` | `系統會用代理登入方式，讓學生們可以在NTHUMods 上輕鬆連結校務系統功能。` → `系統會用代理登入方式，讓學生們可以在 NTHUMods 上輕鬆連結校務系統功能。` | — |
| `campus_map.searchPlaceholder` | `搜尋台達、DELTA 或 DELTA台達629` → `搜尋台達、DELTA 或 DELTA 台達 629` | `Search 台達, DELTA, or DELTA台達629` → `Search 台達, DELTA, or DELTA 台達 629` |
| `alerts.TimetableCourseList.text` | `課表可以在設定頁面客製化喔！` → `你可以在設定頁面客製化課表。` | `You can change your theme in the settings page!` → `You can change your theme in the settings page.` |
| `help.intro.title` | `歡迎來到NTHUMODS` → `歡迎來到 NTHUMods` | `Welcome to NTHUMODS` → `Welcome to NTHUMods` |
| `help.intro.description` | `這可能是能讓你在清大取得好成績的終極工具！以下是一份快速指南，讓你能夠輕鬆入門。` → `這是一份 NTHUMods 功能簡介。` | `NTHUMODS might just be your ultimate companion for academic success at National Tsing Hua University! Here's a quick guide to get you started.` → `A short guide to NTHUMods.` |
| `help.courses.description` | `在你的學習之路上不斷發現和探索，從核心必修到選修，NTHUMods 都能協助你。深入探索，找到最適合你課表的課程！` → `搜尋課程並加入你的課表。` | `Discover a wide range of courses tailored to your academic journey. From core subjects to electives, NTHUMODS has you covered. Dive in and find the perfect fit for your schedule.` → `Search for courses and add them to your timetable.` |
| `help.dashboard.description` | `你的個人化儀表板已經準備就緒！在這裡，你可以追蹤你的課程、作業（即將推出）和考試（即將推出）。保持積極，繼續努力!` → `查看你的課程、作業與考試。` | `Your personalized dashboard awaits! Track your courses, assignments (coming soon), and exams (coming soon) all in one place. Stay organized, stay on top.` → `View your courses, assignments, and exams.` |
| `help.bus.description` | `掌握校園校車路線、班次與站點，輕鬆規劃日常通勤。` → `查看校車路線、班次與站點。` | `Navigating NTHU's campus is a breeze with access to bus routes, timings, and stops to plan your daily commute efficiently. No more waiting in uncertainty.` → `View bus routes, schedules, and stops.` |
| `help.tools.title` | `需要更多功能嗎？` → `其他工具` | `Need more features?` → `More tools` |
| `help.tools.description` | `將你的清大帳戶與 NTHUMods 連結，開啟通往豐富附加工具的大門。輕鬆整合各種功能，豐富你的大學生活。` → `連結清大帳戶以使用需要登入的功能。` | `Link your NTHU account to NTHUMODS and open the door to a treasure trove of additional tools. Seamlessly integrate your academic life by accessing exclusive features tailored to NTHU students.` → `Connect your NTHU account to use features that require sign-in.` |
| `help.dev.title` | `共同成長` → `提供回饋` | `Growing together` → `Send feedback` |
| `help.dev.description` | `我們致力於持續改進，提供最佳體驗。目前應用程式仍在開發中，過程可能會遇到一些困難。但我們重視你的意見，請分享你的想法、回饋，以及你希望看到的功能。` → `如果你發現問題或有功能建議，請告訴我們。` | `We're committed to continuous improvement to offer you the best possible experience. Please note that the app is still in development, and while we strive for perfection, there may be occasional hiccups along the way. We value your input extremely, share your ideas, feedback, and features you'd love to see.` → `Tell us about problems or features you would like to see.` |
| `help.dev.feedback` | `給回饋` → `回報問題` | `Give feedback` → `Report a problem` |
| `help.jump` | `開始！` → `開始` | `Jump in` → `Get started` |
| `footer.tagline` | `由學生製作，為學生服務 ❤️` → `由學生製作，服務學生` | `Made with ❤️ by students for students` → `Made by students for students` |
| `sponsorship.opencollective.subtitle` | `每一塊錢都有幫助！` → `每一塊錢都有幫助。` | `Every $1 helps!` → `Every $1 helps.` |
| `chat.welcome_description` | `我可以幫你搜尋課程、規劃課表、查詢畢業學分。試試下面的建議或直接輸入你的問題！` → `我可以幫你搜尋課程、規劃課表、查詢畢業學分。你也可以直接輸入問題。` | `I can help you search for courses, plan your timetable, and check graduation requirements. Try the suggestions below or type your question!` → `I can help you search for courses, plan your timetable, and check graduation requirements. You can also type your question.` |
| `chat.capabilities` | `搜尋課程 · 規劃課表 · 查詢畢業學分` → `搜尋課程・規劃課表・查詢畢業學分` | — |
| `chat.timetable_renderer.tip` | `💡 提示：點選「加入我的課表」可將所有課程直接加入你的選課清單` → `提示：點選「加入我的課表」可將所有課程直接加入選課清單。` | — |
| `planner.sidebar.creditsPdfLink` | `畢業學分PDF` → `畢業學分 PDF` | — |
| `planner.semesterManagement.idRequired` | `學期ID為必填欄位` → `學期 ID 為必填欄位` | — |
| `navigation.admin` | — → `管理中心` | — → `Admin Center` |
| `pwa.install` | — → `安裝` | — → `Install` |
| `pwa.title` | — → `安裝 NTHUMods` | — → `Install NTHUMods` |
| `pwa.description` | — → `將 NTHUMods 加到主畫面，方便快速開啟。` | — → `Add NTHUMods to your home screen for quick access.` |
| `pwa.ios.share` | — → `點選 Safari 底部的分享按鈕` | — → `Tap the Share button at the bottom of Safari` |
| `pwa.ios.home_screen` | — → `向下捲動並點選「加入主畫面」` | — → `Scroll down and tap "Add to Home Screen"` |
| `pwa.ios.confirm` | — → `點選「加入」確認` | — → `Tap "Add" to confirm` |
| `pwa.android.intro` | — → `在裝置上安裝此應用程式：` | — → `To install this app on your device:` |
| `pwa.android.address_bar` | — → `點選瀏覽器網址列中的安裝圖示` | — → `Look for the install icon in your browser's address bar` |
| `pwa.android.menu` | — → `或從瀏覽器選單選擇「安裝應用程式」` | — → `Or choose "Install app" from your browser's menu` |
| `static.team_title` | — → `團隊` | — → `Team` |
| `static.core_title` | — → `NTHUMods Core` | — → `NTHUMods Core` |
| `static.team_description` | — → `NTHUMods 是由一群熱愛 NTHU 的學生組成的團隊。我們希望透過這個平台，讓學生更方便取得資訊並分享經驗。歡迎加入團隊，一起貢獻。` | — → `NTHUMods is a student team that builds tools for the NTHU community. We make campus information easier to find and share. Join us if you would like to contribute.` |
| `forms.issue.title` | — → `問題回報` | — → `Report a problem` |
| `forms.issue.description` | — → `匿名提交。` | — → `Submitted anonymously.` |
| `forms.issue.label_title` | — → `標題` | — → `Title` |
| `forms.issue.placeholder_title` | — → `請輸入問題或功能名稱` | — → `What feature or bug are you reporting?` |
| `forms.issue.known_issues` | — → `已知問題` | — → `Known issues` |
| `forms.issue.label_description` | — → `詳情` | — → `Details` |
| `forms.issue.detail_hint` | — → `請盡量提供詳細資訊與聯絡方式。` | — → `Include as much detail as possible. Add a contact method if you want a reply.` |
| `forms.issue.markdown_hint` | — → `支援 Markdown。` | — → `Markdown is supported.` |
| `forms.issue.feedback` | — → `回饋` | — → `Feedback` |
| `forms.issue.retrying` | — → `重試中…` | — → `Retrying…` |
| `forms.issue.submitting` | — → `送出中…` | — → `Submitting…` |
| `forms.issue.submit` | — → `送出` | — → `Submit` |
| `common.testing` | — → `測試中` | — → `Testing` |
| `common.redirecting` | — → `正在重新導向…` | — → `Redirecting…` |
| `group.not_found` | — → `找不到群組。` | — → `Group not found.` |
| `group.go_back` | — → `返回` | — → `Go back` |
| `group.copy_invite_link` | — → `複製邀請連結` | — → `Copy invite link` |
| `group.leave` | — → `離開` | — → `Leave` |
| `group.delete_group` | — → `刪除群組` | — → `Delete group` |
| `group.delete_confirm` | — → `確定要刪除這個群組嗎？此操作無法復原。` | — → `Delete this group? This cannot be undone.` |
| `group.members` | — → `成員` | — → `Members` |
| `group.member_count` | — → `{count} 位成員` | — → `{count} members` |
| `group.member_courses` | — → `{count} 門課` | — → `{count} courses` |
| `group.toggle_members` | — → `在右側切換成員以顯示課表` | — → `Toggle members on the right to overlay their timetables` |
| `group.join_group` | — → `加入群組` | — → `Join this group` |
| `group.join_description` | — → `輸入名稱，讓成員辨識你。系統會自動連結你的課表。` | — → `Enter your name so members can identify you. We'll link your timetable automatically.` |
| `group.name_placeholder` | — → `你的姓名或暱稱` | — → `Your name or nickname` |
| `group.join` | — → `加入群組` | — → `Join Group` |
| `group.joined` | — → `已加入群組` | — → `Joined group` |
| `group.left` | — → `已離開群組` | — → `Left group` |
| `group.deleted` | — → `已刪除群組` | — → `Group deleted` |
| `group.error` | — → `錯誤` | — → `Error` |
| `group.name_required` | — → `請輸入你的姓名。` | — → `Please enter your name.` |
| `group.not_loaded` | — → `群組尚未載入。` | — → `Group not loaded.` |
| `privacy_page.sections.2.items.1` | — | — → `When necessary, this website may entrust relevant units to provide services. We require them to keep information confidential and take necessary measures to verify compliance.` |

## Forbidden utility classes removed

The scoped scan has no remaining classes from the forbidden list. `font-semibold` was the only forbidden class present in the diff; it was replaced with `font-medium` or `font-bold` as appropriate. The other forbidden classes had no scoped occurrences to remove.

| Removed class | File |
|---|---|
| `font-semibold` | `apps/web/src/app/[lang]/(mods-pages)/chat/ChatPageContent.tsx` |
| `font-semibold` | `apps/web/src/app/[lang]/(mods-pages)/group/[code]/page.tsx` |
| `font-semibold` | `apps/web/src/components/AI/ChatExample.tsx` |
| `font-semibold` | `apps/web/src/components/BottomNav.tsx` |
| `font-semibold` | `apps/web/src/components/Changelog/WhatsNewDialog.tsx` |
| `font-semibold` | `apps/web/src/components/Chat/ChatContainer.tsx` |
| `font-semibold` | `apps/web/src/components/Chat/RichMessageContent.tsx` |
| `font-semibold` | `apps/web/src/components/Chat/TimetableRenderer.tsx` |
| `font-semibold` | `apps/web/src/components/Help/Help.tsx` |
| `font-semibold` | `apps/web/src/components/SideNav.tsx` |
| `font-semibold` | `apps/web/src/components/Static/TeamContainer.tsx` |

## Scope notes

- No navigation redesign was made.
- No `bus/`, `Timetable/`, `Calendar/`, `Widgets/`, `Courses/`, `CourseDetails/`, `SearchBox/`, `Venue/`, `CommandPalette/`, `settings/`, `(side-pages)/`, or other explicitly owned areas were changed.
- Chinese/Latin spacing is complete for the requested dictionaries and scoped files. This report does not claim ownership of a repository-wide rewrite of unrelated agents' copy.
- No commit, push, or `gh` command was run.
