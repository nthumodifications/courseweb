import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ModsError from "@/app/[lang]/(mods-pages)/error";
import { SidebarProvider } from "@courseweb/ui";
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
import { Dialog, DialogContent } from "@courseweb/ui";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";

const MainLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  const [cookies] = useCookies(["sidebar:state"]);
  const defaultOpen = (cookies["sidebar:state"] ?? "true") === "true";

  return (
    <ChatProvider>
      <HeaderPortalProvider>
        <CalendarProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <GoogleAnalytics />
            <ConsoleLogger />
            <AppSidebar lang={(lang as Language) ?? "zh"} />
            <main className="w-full min-h-full">
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
                    <Outlet context={{ backgroundLocation }} />
                  </Suspense>
                </ErrorBoundary>
              </div>
              {/* Course modal overlay when navigating from course list */}
              {backgroundLocation && <CourseModalOverlay />}
            </main>
            <BottomNav />
            <ChatContainer />
            <ChatFAB />
          </SidebarProvider>
        </CalendarProvider>
      </HeaderPortalProvider>
    </ChatProvider>
  );
};

function CourseModalOverlay() {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();

  // Extract courseId from the current URL if it matches the course detail pattern
  const courseMatch = location.pathname.match(/\/[a-z]{2}\/courses\/([^/]+)/);
  const courseId = courseMatch ? decodeURI(courseMatch[1]) : null;

  if (!courseId) return null;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="max-w-6xl p-0 gap-0">
        <div className="px-4 py-2 lg:px-8 lg:py-4">
          <CourseDetailContainer
            lang={(lang as Language) ?? "zh"}
            courseId={courseId}
            modal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MainLayout;
