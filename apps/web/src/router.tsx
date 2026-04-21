import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import RootRedirect from "@/layouts/RootRedirect";
import LangLayout from "@/layouts/LangLayout";
import MainLayout from "@/layouts/MainLayout";
import OAuthCallbackRedirect from "@/layouts/OAuthCallbackRedirect";
import ShortlinkRedirect from "@/layouts/ShortlinkRedirect";
import AppProviders from "@/layouts/AppProviders";

// Auth callback (outside lang layout)
const AuthCallbackPage = lazy(() => import("@/app/auth/callback/page"));

// Main pages
const TodayPage = lazy(() => import("@/app/[lang]/(mods-pages)/today/page"));
const TimetablePage = lazy(
  () => import("@/app/[lang]/(mods-pages)/timetable/page"),
);
const TimetableViewPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/timetable/view/page"),
);
const CoursesPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/courses/page"),
);
const CourseDetailPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/courses/[courseId]/page"),
);
const BusPage = lazy(() => import("@/app/[lang]/(mods-pages)/bus/page"));
const SportsVenuesPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/sports-venues/page"),
);
const BusRoutePage = lazy(
  () => import("@/app/[lang]/(mods-pages)/bus/[route]/page"),
);
const BusLinePage = lazy(
  () => import("@/app/[lang]/(mods-pages)/bus/[route]/[line]/page"),
);
const CalendarPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/calendar/page"),
);
const SettingsPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/settings/page"),
);
const VenuesPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(venues)/venues/page"),
);
const ChatPage = lazy(() => import("@/app/[lang]/(mods-pages)/chat/page"));
const ShopsPage = lazy(() => import("@/app/[lang]/(mods-pages)/shops/page"));
const AppsPage = lazy(() => import("@/app/[lang]/(mods-pages)/apps/page"));
const GradesPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/student/grades/page"),
);
const StudentIdPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/student/id/page"),
);
const ParcelPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/student/parcel/page"),
);
const PlannerPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/student/planner/page"),
);
const PlannerLayout = lazy(
  () => import("@/app/[lang]/(mods-pages)/student/planner/layout"),
);
const IssuesPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/issues/page"),
);
const ContributePage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/contribute/page"),
);
const TeamPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/team/page"),
);
const PrivacyPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/privacy-policy/page"),
);
const ProxyLoginPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/proxy-login/page"),
);
const NextStepsPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/(side-pages)/next-steps/page"),
);
const OfflinePage = lazy(
  () => import("@/app/[lang]/(mods-pages)/offline/page"),
);
const DesignSystemPage = lazy(() => import("@/pages/DesignSystem"));

// Separate layout page
const WaitlistPage = lazy(() => import("@/app/[lang]/waitlist/page"));

// Not found
const NotFoundPage = lazy(() => import("@/app/[lang]/not-found"));

export const router = createBrowserRouter([
  {
    element: <AppProviders />,
    children: [
      {
        path: "/",
        element: <RootRedirect />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        path: "/api/auth/callback/nthu_oauth",
        element: <OAuthCallbackRedirect />,
      },
      {
        path: "/l/:slug",
        element: <ShortlinkRedirect />,
      },
      {
        path: "/:lang",
        element: <LangLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="today" replace />,
          },
          {
            element: <MainLayout />,
            children: [
              {
                path: "today",
                element: <TodayPage />,
                handle: {
                  title: "Today",
                  titleZh: "行事曆",
                  description:
                    "NTHU academic calendar and today's schedule. Stay on top of important dates, events, and deadlines at National Tsing Hua University.",
                  descriptionZh:
                    "清大學期行事曆與今日行程。掌握國立清華大學重要日程、校園活動與學期節點，不錯過任何重要時刻。",
                },
              },
              {
                path: "timetable",
                element: <TimetablePage />,
                handle: {
                  title: "Timetable",
                  titleZh: "時間表",
                  description:
                    "Build and manage your NTHU course timetable. Easily plan your weekly schedule and avoid conflicts at National Tsing Hua University.",
                  descriptionZh:
                    "建立並管理您的清大個人課表。輕鬆規劃每週行程、避免衝堂，讓清華大學選課更有效率。",
                },
              },
              {
                path: "timetable/view",
                element: <TimetableViewPage />,
                handle: {
                  title: "Timetable View",
                  titleZh: "時間表檢視",
                  description:
                    "View your NTHU course timetable in a clean weekly layout.",
                  descriptionZh: "以週檢視模式查看清大課表，清楚掌握每日上課時間。",
                },
              },
              {
                path: "courses",
                element: <CoursesPage />,
                handle: {
                  title: "Courses",
                  titleZh: "課表",
                  description:
                    "Search and browse NTHU courses. View syllabi, grading policies, past scores, prerequisites, and student reviews for any course at National Tsing Hua University.",
                  descriptionZh:
                    "搜尋清大課程、查看課程大綱、評分記錄與學生心得。支援跨系選修、先修課程查詢，快速找到最適合的清華大學課程。",
                },
              },
              {
                path: "courses/:courseId",
                element: <CourseDetailPage />,
              },
              {
                path: "bus",
                element: <BusPage />,
                handle: {
                  title: "Bus",
                  titleZh: "校車",
                  description:
                    "NTHU campus shuttle bus schedules and routes. Check real-time bus information and plan your commute around National Tsing Hua University.",
                  descriptionZh:
                    "清大校車時刻表與路線查詢。掌握國立清華大學各路線校車班次，輕鬆規劃校園內外通勤行程。",
                },
              },
              {
                path: "bus/:route",
                element: <BusRoutePage />,
              },
              {
                path: "bus/:route/:line",
                element: <BusLinePage />,
              },
              {
                path: "calendar",
                element: <CalendarPage />,
                handle: {
                  title: "Calendar",
                  titleZh: "日曆",
                  description:
                    "NTHU academic calendar with semester dates, holidays, and important deadlines. Keep track of National Tsing Hua University's academic schedule.",
                  descriptionZh:
                    "清大學期日曆，包含重要日期、假期與截止時限。完整呈現國立清華大學學期行事曆，方便統籌個人規劃。",
                },
              },
              {
                path: "settings",
                element: <SettingsPage />,
                handle: {
                  title: "Settings",
                  titleZh: "設定",
                  description: "Customize your NTHUMods experience.",
                  descriptionZh: "個人化您的 NTHUMods 使用體驗。",
                },
              },
              {
                path: "venues",
                element: <VenuesPage />,
                handle: {
                  title: "Venues",
                  titleZh: "地點",
                  description:
                    "Find classrooms, buildings, and facilities on the NTHU campus. Interactive map and location details for National Tsing Hua University.",
                  descriptionZh:
                    "查詢清大校園教室、建築與設施位置。互動式地圖帶您快速找到國立清華大學各地點，掌握上課地點不迷路。",
                },
              },
              {
                path: "sports-venues",
                element: <SportsVenuesPage />,
                handle: {
                  title: "Sports Venues",
                  titleZh: "體育場館",
                  description:
                    "Check availability and schedules for NTHU sports facilities. Find courts, pools, and gyms at National Tsing Hua University.",
                  descriptionZh:
                    "查詢清大體育場館使用時間表與空閒狀況。球場、游泳池、健身房，掌握國立清華大學各運動設施最新資訊。",
                },
              },
              {
                path: "venues/:locationId",
                element: <VenuesPage />,
              },
              {
                path: "chat",
                element: <ChatPage />,
                handle: {
                  title: "AI Course Assistant",
                  titleZh: "AI 課程助手",
                  description:
                    "Ask the NTHU AI course assistant anything about courses, schedules, and academic planning at National Tsing Hua University.",
                  descriptionZh:
                    "清大 AI 課程助手，即時解答清華大學課程相關問題。選課建議、課程比較、學期規劃，一問即答。",
                },
              },
              {
                path: "shops",
                element: <ShopsPage />,
                handle: {
                  title: "Shops & Restaurants",
                  titleZh: "餐廳",
                  description:
                    "Discover restaurants, cafés, and shops on the NTHU campus. Find dining options and store hours at National Tsing Hua University.",
                  descriptionZh:
                    "清大校園餐廳、咖啡廳與店家資訊。查詢國立清華大學校園內各餐飲店家的營業時間與位置。",
                },
              },
              {
                path: "apps",
                element: <AppsPage />,
                handle: {
                  title: "All Features",
                  titleZh: "功能列表",
                  description:
                    "Explore all NTHUMods features for NTHU students — courses, bus, calendar, venues, and more.",
                  descriptionZh:
                    "探索 NTHUMods 為清大學生提供的所有功能，包含課程查詢、校車時刻、行事曆、場館地圖等一站式服務。",
                },
              },
              {
                path: "student/grades",
                element: <GradesPage />,
                handle: {
                  title: "Grades",
                  titleZh: "成績",
                  description: "View your NTHU course grades and academic record.",
                  descriptionZh: "查看清大個人成績與學業記錄。",
                },
              },
              {
                path: "student/id",
                element: <StudentIdPage />,
                handle: {
                  title: "Student ID",
                  titleZh: "學生證",
                  description: "Digital NTHU student ID card.",
                  descriptionZh: "清大數位學生證。",
                },
              },
              {
                path: "student/parcel",
                element: <ParcelPage />,
                handle: {
                  title: "Parcel",
                  titleZh: "包裹",
                  description: "Track your parcels delivered to NTHU.",
                  descriptionZh: "查詢清大包裹收件狀況。",
                },
              },
              {
                element: <PlannerLayout />,
                children: [
                  {
                    path: "student/planner",
                    element: <PlannerPage />,
                    handle: {
                      title: "Graduation Planner",
                      titleZh: "畢業規劃",
                      description:
                        "Plan your path to graduation at NTHU. Track credit requirements, electives, and degree progress at National Tsing Hua University.",
                      descriptionZh:
                        "規劃清大畢業學分路徑。追蹤必修、選修進度，確保符合國立清華大學畢業要求，提早掌握學分缺口。",
                    },
                  },
                ],
              },
              {
                path: "issues",
                element: <IssuesPage />,
                handle: {
                  title: "Report Issues",
                  titleZh: "問題回報",
                  description:
                    "Report bugs or suggest improvements for NTHUMods.",
                  descriptionZh: "回報 NTHUMods 問題或提出改善建議。",
                },
              },
              {
                path: "contribute",
                element: <ContributePage />,
                handle: {
                  title: "Contribute",
                  titleZh: "貢獻",
                  description:
                    "Contribute to NTHUMods – the open-source platform built by NTHU students for NTHU students.",
                  descriptionZh:
                    "參與 NTHUMods 開源貢獻。清大學生自主開發、歡迎所有人一起讓清大資訊平臺更好。",
                },
              },
              {
                path: "team",
                element: <TeamPage />,
                handle: {
                  title: "Team",
                  titleZh: "團隊",
                  description:
                    "Meet the NTHU students behind NTHUMods – the open-source course platform for National Tsing Hua University.",
                  descriptionZh:
                    "認識 NTHUMods 背後的清大學生開發團隊，了解這個由清華大學學生自主打造的開源平臺。",
                },
              },
              {
                path: "privacy-policy",
                element: <PrivacyPage />,
                handle: {
                  title: "Privacy Policy",
                  titleZh: "隱私權政策",
                  description: "NTHUMods privacy policy and data handling practices.",
                  descriptionZh: "NTHUMods 隱私權政策與個人資料處理方式說明。",
                },
              },
              {
                path: "proxy-login",
                element: <ProxyLoginPage />,
              },
              {
                path: "next-steps",
                element: <NextStepsPage />,
              },
              {
                path: "offline",
                element: <OfflinePage />,
                handle: { title: "Offline", titleZh: "離線" },
              },
              {
                path: "design-system",
                element: <DesignSystemPage />,
                handle: { title: "Design System", titleZh: "設計系統" },
              },
              {
                path: "*",
                element: <NotFoundPage />,
              },
            ],
          },
          {
            path: "waitlist",
            element: <WaitlistPage />,
            handle: { title: "Waitlist", titleZh: "候補" },
          },
        ],
      },
    ],
  },
]);
