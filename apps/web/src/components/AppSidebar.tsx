import SideNav from "@/components/SideNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@courseweb/ui";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";

import { lazy, Suspense } from "react";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { Language } from "@/types/settings";
import SponsorshipBanner from "./Sponsorship/SponsorshipBanner";
import { Badge } from "@courseweb/ui";

const HelpDynamic = lazy(() => import("@/components/Help/Help"));

const GenericIssueFormDynamic = lazy(
  () => import("@/components/Forms/GenericIssueFormDialog"),
);

const MinifiedUpcomingEventsDynamic = lazy(
  () => import("@/components/Calendar/MinifiedUpcomingEvents"),
);

const PWAInstallPromptDynamic = lazy(
  () => import("@/components/PWA/PWAInstallPrompt"),
);

const AppSidebar = ({ lang }: { lang: Language }) => {
  const isDevServer = import.meta.env.DEV;
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex flex-row gap-4">
          <NTHUModsLogo />

          {isDevServer && <Badge variant={"destructive"}>Testing</Badge>}
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
