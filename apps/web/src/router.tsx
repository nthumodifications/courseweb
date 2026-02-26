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
                handle: { title: "Today" },
              },
              {
                path: "timetable",
                element: <TimetablePage />,
                handle: { title: "Timetable" },
              },
              {
                path: "timetable/view",
                element: <TimetableViewPage />,
                handle: { title: "Timetable View" },
              },
              {
                path: "courses",
                element: <CoursesPage />,
                handle: { title: "Courses" },
              },
              {
                path: "courses/:courseId",
                element: <CourseDetailPage />,
              },
              {
                path: "bus",
                element: <BusPage />,
                handle: { title: "Bus" },
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
                handle: { title: "Calendar" },
              },
              {
                path: "settings",
                element: <SettingsPage />,
                handle: { title: "Settings" },
              },
              {
                path: "venues",
                element: <VenuesPage />,
                handle: { title: "Venues" },
              },
              {
                path: "venues/:locationId",
                element: <VenuesPage />,
              },
              {
                path: "chat",
                element: <ChatPage />,
                handle: { title: "Chat" },
              },
              {
                path: "shops",
                element: <ShopsPage />,
                handle: { title: "Shops" },
              },
              {
                path: "apps",
                element: <AppsPage />,
                handle: { title: "Apps" },
              },
              {
                path: "student/grades",
                element: <GradesPage />,
                handle: { title: "Grades" },
              },
              {
                path: "student/id",
                element: <StudentIdPage />,
                handle: { title: "Student ID" },
              },
              {
                path: "student/parcel",
                element: <ParcelPage />,
                handle: { title: "Parcel" },
              },
              {
                path: "student/planner",
                element: <PlannerPage />,
                handle: { title: "Planner" },
              },
              {
                path: "issues",
                element: <IssuesPage />,
                handle: { title: "Issues" },
              },
              {
                path: "contribute",
                element: <ContributePage />,
                handle: { title: "Contribute" },
              },
              {
                path: "team",
                element: <TeamPage />,
                handle: { title: "Team" },
              },
              {
                path: "privacy-policy",
                element: <PrivacyPage />,
                handle: { title: "Privacy Policy" },
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
                handle: { title: "Offline" },
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
            handle: { title: "Waitlist" },
          },
        ],
      },
    ],
  },
]);
