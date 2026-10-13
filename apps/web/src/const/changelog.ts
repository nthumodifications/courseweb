import type { ChangelogVisualId } from "@/components/Changelog/previewRegistry";

export type ChangelogEntryType = "feature" | "improvement" | "fix";

export type ChangelogActionKey =
  | "bus"
  | "modules"
  | "prerequisites"
  | "search"
  | "timetable"
  | "usage"
  | "youbike";

export type ChangelogVisual =
  | { kind: "component"; id: ChangelogVisualId }
  | { kind: "image"; src: string; alt: string; width: number; height: number };

export interface ChangelogItem {
  type: ChangelogEntryType;
  title: { zh: string; en: string };
  description?: { zh: string; en: string };
  action?: { href: string; key: ChangelogActionKey };
  visual?: ChangelogVisual;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  highlight?: boolean;
  title?: { zh: string; en: string };
  items: ChangelogItem[];
}

/**
 * Keep this list newest-first. Release notes are grouped from the user-facing
 * changes in the corresponding commits rather than generated at runtime.
 */
export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "2026.10.2",
    date: "2026-10-10",
    title: {
      zh: "課程、課表與儀表板更新",
      en: "Courses, timetable & dashboard updates",
    },
    items: [
      {
        type: "feature",
        title: {
          zh: "分享與查看課程成績統計",
          en: "Share and view course grade statistics",
        },
        description: {
          zh: "依照引導分享課程平均與標準差資料；課程詳細頁現在也會顯示歷年成績統計與整體成績摘要。",
          en: "Share course average and standard-deviation data with a guided walkthrough, then see historical statistics and an overall grade summary on course details.",
        },
        action: { href: "/courses", key: "search" },
      },
      {
        type: "feature",
        title: { zh: "訂閱課表到你的日曆", en: "Subscribe to your timetable" },
        description: {
          zh: "在課表中用 Google、Apple 或 Outlook 訂閱，或直接複製訂閱連結。",
          en: "Subscribe with Google Calendar, Apple Calendar, or Outlook, or copy the subscription link from your timetable.",
        },
        action: { href: "/timetable", key: "timetable" },
      },
      {
        type: "improvement",
        title: {
          zh: "下一堂課的公車建議",
          en: "Bus suggestions for your next class",
        },
        description: {
          zh: "今日頁面會建議下一堂課前該搭哪班校園公車；跨校區移動時也會提醒是否來得及。",
          en: "Today can suggest the campus bus to catch for your next class and warn when a cross-campus transfer is too short.",
        },
      },
      {
        type: "feature",
        title: { zh: "教師頁面與連結", en: "Instructor pages and links" },
        description: {
          zh: "從課程中的教師連結開啟教師頁面，查看該教師跨學期授課的課程。",
          en: "Open an instructor's page from course links to browse their courses across semesters.",
        },
        action: { href: "/courses", key: "search" },
      },
      {
        type: "feature",
        title: { zh: "選課階段提醒", en: "Course-selection phase reminders" },
        description: {
          zh: "用顏色與日期查看各選課階段，頂端提醒也會顯示目前或下一個階段。",
          en: "See course-selection phases with colours and dates, plus a top-bar reminder for the current or next phase.",
        },
        action: { href: "/courses", key: "search" },
      },
      {
        type: "feature",
        title: { zh: "更多儀表板小工具", en: "More dashboard widgets" },
        description: {
          zh: "可在儀表板加入目前營業中的店家、即將到來的活動與成績，也能查看圖書館、洗衣房、體育場館和 YouBike。",
          en: "Add shops open now, upcoming events, and grades to your dashboard, along with library, laundry, sports venue, and YouBike widgets.",
        },
      },
      {
        type: "improvement",
        title: {
          zh: "更完整的問題回報診斷資料",
          en: "Richer diagnostics for issue reports",
        },
        description: {
          zh: "回報問題時可選擇附上更完整的匿名診斷資料，協助我們排查問題。",
          en: "Choose whether to attach richer anonymous diagnostics when reporting an issue to help with troubleshooting.",
        },
      },
      {
        type: "improvement",
        title: { zh: "更快、更好用", en: "Faster and more accessible" },
        description: {
          zh: "首次載入更快，更多控制項也能使用螢幕閱讀器。",
          en: "First load is faster, and more controls now have accessible names.",
        },
      },
      {
        type: "fix",
        title: {
          zh: "介面文字跟隨語言",
          en: "Interface text follows your language",
        },
        description: {
          zh: "更多介面文字會跟隨你選擇的語言顯示。",
          en: "More interface text now follows the language you choose.",
        },
      },
    ],
  },
  {
    version: "2026.10.1",
    date: "2026-10-07",
    highlight: true,
    title: {
      zh: "公車、YouBike、課程與課表更新",
      en: "Buses, YouBike, courses & timetable",
    },
    items: [
      {
        type: "feature",
        title: { zh: "市區公車", en: "City buses" },
        description: {
          zh: "挑選常搭路線，把「我的公車」放在最上方；現在也能查看 29 條新竹市區路線與城際公車的路線詳情。",
          en: "Pick your lines and keep My buses at the top. Browse 29 Hsinchu city routes plus intercity buses, with a detail page for each line.",
        },
        action: { href: "/bus?tab=city", key: "bus" },
        visual: { kind: "component", id: "city-buses" },
      },
      {
        type: "feature",
        title: { zh: "YouBike 車量", en: "YouBike availability" },
        description: {
          zh: "即時查看清大校本部與南大校區的可借車輛與可還空位。",
          en: "Check available bikes and empty docks around NTHU's Main and Nanda campuses.",
        },
        action: { href: "/youbike", key: "youbike" },
        visual: { kind: "component", id: "youbike" },
      },
      {
        type: "feature",
        title: { zh: "課程模組", en: "Course modules" },
        description: {
          zh: "跨學期查看開課情況、滿班率、平均成績、授課教師與選課熱度。",
          en: "See when a course runs, its fill rate, average grade, instructors, and demand across semesters.",
        },
        action: { href: "/courses/modules", key: "modules" },
        visual: { kind: "component", id: "course-module" },
      },
      {
        type: "feature",
        title: { zh: "先修課程圖", en: "Prerequisite graph" },
        description: {
          zh: "查看課程需要先修哪些科目，以及修完後會解鎖哪些課程。",
          en: "See required prerequisites for a course and which courses they unlock next.",
        },
        action: { href: "/courses/module/CS%3A2104", key: "prerequisites" },
        visual: { kind: "component", id: "prerequisite-graph" },
      },
      {
        type: "improvement",
        title: { zh: "搜尋更穩", en: "More reliable search" },
        description: {
          zh: "搜尋索引載入時會顯示載入中；即使離線，也會繼續使用快取的索引。",
          en: "Search keeps using its cached index offline and shows loading while a fresh index is unavailable.",
        },
        action: { href: "/courses", key: "search" },
        visual: { kind: "component", id: "search-states" },
      },
      {
        type: "fix",
        title: { zh: "課表更安全", en: "Safer timetables" },
        description: {
          zh: "依學分排序不會再刪掉課程；暫時無法載入的課程也會保留在課表中。",
          en: "Sorting by credits no longer deletes courses, and courses that cannot load are kept in your timetable.",
        },
        action: { href: "/timetable", key: "timetable" },
        visual: { kind: "component", id: "timetable-safe" },
      },
      {
        type: "improvement",
        title: { zh: "另外幾個小更新", en: "A few smaller updates" },
        description: {
          zh: "健身房與圖書館現在會預測各時段人潮；課程詳細頁的標題間距也更整齊。",
          en: "The gym and library now forecast how busy each hour gets, and course detail headers keep even spacing.",
        },
        action: { href: "/sports-venues", key: "usage" },
        visual: { kind: "component", id: "smaller-updates" },
      },
    ],
  },
  {
    version: "2026.09.1",
    date: "2026-09-10",
    title: { zh: "搜尋與穩定性更新", en: "Search & stability" },
    items: [
      {
        type: "feature",
        title: { zh: "新增備援搜尋服務", en: "Backup search provider" },
        description: {
          zh: "加入備援 Algolia 憑證，並在需要時改用 Supabase 搜尋。",
          en: "Added backup Algolia credentials and a Supabase fallback for search.",
        },
      },
      {
        type: "improvement",
        title: { zh: "更可靠的課程比對", en: "More reliable course matching" },
        description: {
          zh: "課程比對改在 PostgreSQL 中執行，不再逐筆掃描資料列。",
          en: "Course matching now runs in PostgreSQL instead of scanning rows.",
        },
      },
      {
        type: "fix",
        title: {
          zh: "修復過時資源與課表快照問題",
          en: "Recover from stale assets and timetable snapshots",
        },
        description: {
          zh: "資源重新驗證不再錯誤回傳 404；空白的遠端快照也不會覆蓋本機課表，並恢復 PWA 分塊載入。",
          en: "Asset revalidation no longer falls through to a 404; empty remote snapshots no longer overwrite local timetables, and PWA chunk loading is restored.",
        },
      },
      {
        type: "fix",
        title: {
          zh: "強化裝置 ID 與篩選器解析",
          en: "Harden device IDs and filter parsing",
        },
        description: {
          zh: "裝置 ID 改用密碼學安全的亂數來源，並限制篩選器解析範圍。",
          en: "Device IDs now use a cryptographically secure random source, and filter parsing is bounded.",
        },
      },
    ],
  },
  {
    version: "2026.08.1",
    date: "2026-08-17",
    title: { zh: "維護與資料工具更新", en: "Maintenance & data tooling" },
    items: [
      {
        type: "fix",
        title: {
          zh: "修正畢業要求爬蟲的巢狀系所連結",
          en: "Fix nested department links in graduation requirements",
        },
        description: {
          zh: "修復含有巢狀標籤的年度連結，讓畢業要求資料能正確抓取系所。",
          en: "Fixed nested year-link tags so graduation requirements can include the correct departments.",
        },
      },
      {
        type: "feature",
        title: { zh: "自動化課程爬蟲流程", en: "Automate course scraping" },
        description: {
          zh: "加入 GitHub Actions 課程爬蟲工作流程。",
          en: "Added a GitHub Actions workflow for course scraping.",
        },
      },
      {
        type: "improvement",
        title: { zh: "改善本機開發設定", en: "Improve local web development" },
        description: {
          zh: "更新本機網頁開發設定與相關文件。",
          en: "Improved the local web development setup and its documentation.",
        },
      },
    ],
  },
  {
    version: "2026.07.1",
    date: "2026-07-06",
    title: { zh: "規劃工具與個人化更新", en: "Planning & personalization" },
    items: [
      {
        type: "feature",
        title: {
          zh: "響應式畢業規劃工具",
          en: "Responsive graduation planner",
        },
        description: {
          zh: "全面更新畢業規劃工具的 RWD 介面，並改善拖放操作與多語系支援。",
          en: "Overhauled the graduation planner for responsive layouts, with improved drag-and-drop interactions and i18n support.",
        },
      },
      {
        type: "feature",
        title: {
          zh: "個人化儀表板與課表",
          en: "Personalize your dashboard and timetable",
        },
        description: {
          zh: "新增主題預設、Widget 儀表板、導覽列排序與課表儲存格自訂功能。",
          en: "Added theme presets, a widget dashboard, navigation reordering, and timetable-cell customization.",
        },
      },
      {
        type: "feature",
        title: {
          zh: "新增使用者提供的上課日期",
          en: "Add user-submitted course dates",
        },
        description: {
          zh: "使用者可以提供課程日期，協助補充課程日程資料。",
          en: "Users can submit course dates to help fill in course schedule data.",
        },
      },
      {
        type: "improvement",
        title: { zh: "改善搜尋引擎摘要", en: "Improve search engine metadata" },
        description: {
          zh: "更新各頁面的 SEO 中繼資料與搜尋結果摘要設定。",
          en: "Improved per-page SEO metadata and search-result snippet settings.",
        },
      },
    ],
  },
  {
    version: "2026.06.1",
    date: "2026-06-24",
    title: { zh: "社群課表與 AI 助手更新", en: "Community timetables & AI" },
    items: [
      {
        type: "feature",
        title: {
          zh: "分享課表、群組與社群瀏覽",
          en: "Share timetables with groups and community",
        },
        description: {
          zh: "新增課表分享連結、課表群組與社群課表瀏覽功能。",
          en: "Added timetable share links, groups, and a community timetable gallery.",
        },
      },
      {
        type: "improvement",
        title: {
          zh: "更聰明的 AI 課程助手",
          en: "Smarter AI course assistant",
        },
        description: {
          zh: "改善聊天體驗，加入歷史記錄、課表脈絡與課程大綱摘要。",
          en: "Improved chat UX with persistent history, timetable context, and syllabus summarization.",
        },
      },
      {
        type: "fix",
        title: {
          zh: "改善體育場館資料更新",
          en: "Improve sports venue refresh and parsing",
        },
        description: {
          zh: "修正全域重新整理、換行篩選、Worker 逾時與 PDF 解析問題。",
          en: "Fixed global refresh, newline filtering, Worker timeouts, and PDF parsing issues.",
        },
      },
    ],
  },
];
