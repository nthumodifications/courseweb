import { Outlet, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
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
import { useCookies } from "react-cookie";
import { CourseDialogProvider } from "@/components/Courses/CourseDialog";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import CustomCSSInjector from "@/components/CustomCSS/CustomCSSInjector";
import AnnouncementBar from "@/components/Alerts/AnnouncementBar";
import useDictionary from "@/dictionaries/useDictionary";

const WhatsNewDialogDynamic = lazy(
  () => import("@/components/Changelog/WhatsNewDialog"),
);

const MainLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();
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
              <AppSidebar lang={lang === "en" ? "en" : "zh"} />
              <SidebarInset className="min-w-0 overflow-x-hidden">
                <Header />
                <AnnouncementBar />
                <div className="pt-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0 md:pl-2">
                  <ErrorBoundary FallbackComponent={ModsError}>
                    <Suspense
                      fallback={
                        <div className="flex flex-col gap-4 px-4">
                          <div className="flex flex-col gap-4">
                            <span className="text-muted-foreground font-medium">
                              {dict.common.loading}
                            </span>
                            <div className="h-2 w-36 bg-muted rounded-full animate-pulse"></div>
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
              <CommandPalette />
              <CustomCSSInjector />
              <Suspense fallback={null}>
                <WhatsNewDialogDynamic />
              </Suspense>
            </CourseDialogProvider>
          </SidebarProvider>
        </CalendarProvider>
      </HeaderPortalProvider>
    </ChatProvider>
  );
};

export default MainLayout;
