import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import RootRedirect from "@/layouts/RootRedirect";
import LangLayout from "@/layouts/LangLayout";
import MainLayout from "@/layouts/MainLayout";
import OAuthCallbackRedirect from "@/layouts/OAuthCallbackRedirect";
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
                handle: { title: "Today", titleZh: "行事曆" },
              },
              {
                path: "timetable",
                element: <TimetablePage />,
                handle: { title: "Timetable", titleZh: "時間表" },
              },
              {
                path: "timetable/view",
                element: <TimetableViewPage />,
                handle: { title: "Timetable View", titleZh: "時間表檢視" },
              },
              {
                path: "courses",
                element: <CoursesPage />,
                handle: { title: "Courses", titleZh: "課表" },
              },
              {
                path: "courses/:courseId",
                element: <CourseDetailPage />,
              },
              {
                path: "bus",
                element: <BusPage />,
                handle: { title: "Bus", titleZh: "校車" },
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
                handle: { title: "Calendar", titleZh: "日曆" },
              },
              {
                path: "settings",
                element: <SettingsPage />,
                handle: { title: "Settings", titleZh: "設定" },
              },
              {
                path: "venues",
                element: <VenuesPage />,
                handle: { title: "Venues", titleZh: "地點" },
              },
              {
                path: "venues/:locationId",
                element: <VenuesPage />,
              },
              {
                path: "chat",
                element: <ChatPage />,
                handle: { title: "Chat", titleZh: "AI 課程助手" },
              },
              {
                path: "shops",
                element: <ShopsPage />,
                handle: { title: "Shops", titleZh: "餐廳" },
              },
              {
                path: "apps",
                element: <AppsPage />,
                handle: { title: "Apps", titleZh: "功能列表" },
              },
              {
                path: "student/grades",
                element: <GradesPage />,
                handle: { title: "Grades", titleZh: "成績" },
              },
              {
                path: "student/id",
                element: <StudentIdPage />,
                handle: { title: "Student ID", titleZh: "學生證" },
              },
              {
                path: "student/parcel",
                element: <ParcelPage />,
                handle: { title: "Parcel", titleZh: "包裹" },
              },
              {
                path: "student/planner",
                element: <PlannerPage />,
                handle: { title: "Planner", titleZh: "畢業規劃" },
              },
              {
                path: "issues",
                element: <IssuesPage />,
                handle: { title: "Issues", titleZh: "問題回報" },
              },
              {
                path: "contribute",
                element: <ContributePage />,
                handle: { title: "Contribute", titleZh: "貢獻" },
              },
              {
                path: "team",
                element: <TeamPage />,
                handle: { title: "Team", titleZh: "團隊" },
              },
              {
                path: "privacy-policy",
                element: <PrivacyPage />,
                handle: { title: "Privacy Policy", titleZh: "隱私權政策" },
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
