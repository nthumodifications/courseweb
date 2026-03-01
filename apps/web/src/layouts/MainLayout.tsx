import { Outlet, useParams } from "react-router-dom";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ModsError from "@/app/[lang]/(mods-pages)/error";
import { SidebarProvider, SidebarInset } from "@courseweb/ui";
import { CalendarProvider } from "@/components/Calendar/calendar_hook";
import { HeaderPortalProvider } from "@/components/Portal/HeaderPortal";
import { ChatProvider, ChatContainer, ChatFAB } from "@/components/Chat";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ConsoleLogger from "@/components/ConsoleLogger";
import AppSidebar from "@/components/AppSidebar";
import { Language } from "@/types/settings";
import { useCookies } from "react-cookie";
import { CourseDialogProvider } from "@/components/Courses/CourseDialog";

const MainLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const [cookies] = useCookies(["sidebar:state"]);
  const defaultOpen = (cookies["sidebar:state"] ?? "true") === "true";

  return (
    <ChatProvider>
      <HeaderPortalProvider>
        <CalendarProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <CourseDialogProvider>
              <GoogleAnalytics />
              <ConsoleLogger />
              <AppSidebar lang={(lang as Language) ?? "zh"} />
              <SidebarInset>
                <Header />
                <div className="pt-4 pb-[5rem] md:pb-0 md:pl-2">
                  <ErrorBoundary FallbackComponent={ModsError}>
                    <Suspense
                      fallback={
                        <div className="grid place-items-center w-full h-screen">
                          <div className="flex flex-col items-center">
                            <span className="mt-2 text-gray-300 dark:text-neutral-700 font-bold text-xl">
                              Loading 載入中...
                            </span>
                            <div className="h-2 w-36 bg-gray-300 dark:bg-neutral-700 rounded-full mt-4 animate-pulse"></div>
                          </div>
                        </div>
                      }
                    >
                      <Outlet />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </SidebarInset>
              <BottomNav />
              <ChatContainer />
              <ChatFAB />
            </CourseDialogProvider>
          </SidebarProvider>
        </CalendarProvider>
      </HeaderPortalProvider>
    </ChatProvider>
  );
};

export default MainLayout;
