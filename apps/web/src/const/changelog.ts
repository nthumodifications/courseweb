export type ChangelogEntryType = "feature" | "improvement" | "fix";

export interface ChangelogItem {
  type: ChangelogEntryType;
  title: { zh: string; en: string };
  description?: { zh: string; en: string };
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
    version: "2026.09.1",
    date: "2026-09-10",
    highlight: true,
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
