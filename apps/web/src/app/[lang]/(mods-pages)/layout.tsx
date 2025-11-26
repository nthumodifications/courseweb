import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ConsoleLogger from "@/components/ConsoleLogger";
import { LangProps } from "@/types/pages";
import { SidebarProvider } from "@courseweb/ui";
import AppSidebar from "@/components/AppSidebar";
import { cookies } from "next/headers";
import { CalendarProvider } from "@/components/Calendar/calendar_hook";
import { HeaderPortalProvider } from "@/components/Portal/HeaderPortal";
import { ChatProvider, ChatContainer, ChatFAB } from "@/components/Chat";

const NTHUModsLayout = async ({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
} & LangProps) => {
  const cookieStore = await cookies();
  const defaultOpen =
    (cookieStore.get("sidebar:state")?.value ?? "true") === "true";

  return (
    <>
      <ChatProvider>
        <HeaderPortalProvider>
          <CalendarProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <GoogleAnalytics />
              <ConsoleLogger />
              <AppSidebar lang={params.lang} />
              <main className="w-full min-h-full">
                <Header />
                <div className="pt-4 pb-[5rem] md:pb-0 md:pl-2">{children}</div>
                {modal}
              </main>
              <BottomNav />
              <ChatContainer />
              <ChatFAB />
            </SidebarProvider>
          </CalendarProvider>
        </HeaderPortalProvider>
      </ChatProvider>
    </>
  );
};

export default NTHUModsLayout;
