import Header from "@/components/Header";
import SideNav from "@/components/SideNav";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import ConsoleLogger from "@/components/ConsoleLogger";
import { LangProps } from "@/types/pages";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";

import dynamic from "next/dynamic";

const HelpDynamic = dynamic(() => import("@/components/Help/Help"));

const GenericIssueFormDynamic = dynamic(
  () => import("@/components/Forms/GenericIssueFormDialog"),
);

const NTHUModsLayout = ({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
} & LangProps) => {
  return (
    <>
      <SidebarProvider>
        <GoogleAnalytics />
        <ConsoleLogger />
        <Sidebar collapsible="offcanvas">
          <SidebarHeader className="p-4">
            <NTHUModsLogo />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SideNav />
          </SidebarContent>
          <SidebarFooter>
            <div className="flex flex-row justify-stretch gap-2">
              <HelpDynamic />
              <GenericIssueFormDynamic />
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="w-full min-h-full">
          <Header />
          {children}
          {modal}
        </main>
        <BottomNav />
      </SidebarProvider>
    </>
  );
};

export default NTHUModsLayout;
