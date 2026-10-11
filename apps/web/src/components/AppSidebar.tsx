import SideNav from "@/components/SideNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  Badge,
} from "@courseweb/ui";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";

import { Suspense } from "react";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { Language } from "@/types/settings";
import SponsorshipBanner from "./Sponsorship/SponsorshipBanner";
import useDictionary from "@/dictionaries/useDictionary";
import { lazyWithRetry } from "@/lib/chunk-recovery";

const HelpDynamic = lazyWithRetry(() => import("@/components/Help/Help"));

const GenericIssueFormDynamic = lazyWithRetry(
  () => import("@/components/Forms/GenericIssueFormDialog"),
);

const MinifiedUpcomingEventsDynamic = lazyWithRetry(
  () => import("@/components/Calendar/MinifiedUpcomingEvents"),
);

const PWAInstallPromptDynamic = lazyWithRetry(
  () => import("@/components/PWA/PWAInstallPrompt"),
);

const AppSidebar = ({ lang }: { lang: Language }) => {
  const isDevServer = import.meta.env.DEV;
  const dict = useDictionary();
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex flex-row gap-4">
          <NTHUModsLogo />

          {isDevServer && (
            <Badge variant={"destructive"}>{dict.common.testing}</Badge>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SideNav />
      </SidebarContent>
      <SidebarFooter className="flex flex-col">
        <div className="px-2 mb-2">
          <Suspense fallback={null}>
            <PWAInstallPromptDynamic />
          </Suspense>
        </div>
        <div className="pl-2">
          <CurrentSemesterLabel language={lang} />
        </div>
        <div className="border-t border-border pt-2">
          <Suspense fallback={null}>
            <MinifiedUpcomingEventsDynamic />
          </Suspense>
        </div>
        <div className="px-2 mt-2">
          <SponsorshipBanner />
        </div>
        <div className="flex flex-row justify-stretch gap-2 mt-2 px-2">
          <Suspense fallback={null}>
            <HelpDynamic />
          </Suspense>
          <Suspense fallback={null}>
            <GenericIssueFormDynamic />
          </Suspense>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
