import SideNav from "@/components/SideNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";

import dynamic from "next/dynamic";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { Language } from "@/types/settings";
import SponsorshipBanner from "./Sponsorship/SponsorshipBanner";
import { Badge } from "@/components/ui/badge";

const HelpDynamic = dynamic(() => import("@/components/Help/Help"));

const GenericIssueFormDynamic = dynamic(
  () => import("@/components/Forms/GenericIssueFormDialog"),
);

const MinifiedUpcomingEventsDynamic = dynamic(
  () => import("@/components/Calendar/MinifiedUpcomingEvents"),
);

const PWAInstallPromptDynamic = dynamic(
  () => import("@/components/PWA/PWAInstallPrompt"),
);

const AppSidebar = ({ lang }: { lang: Language }) => {
  const isDevServer = process.env.NODE_ENV === "development";
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
          <PWAInstallPromptDynamic />
        </div>
        <div className="pl-2">
          <CurrentSemesterLabel language={lang} />
        </div>
        <div className="border-t border-border pt-2">
          <MinifiedUpcomingEventsDynamic />
        </div>
        <div className="px-2 mt-2">
          <SponsorshipBanner />
        </div>
        <div className="flex flex-row justify-stretch gap-2 mt-2 px-2">
          <HelpDynamic />
          <GenericIssueFormDynamic />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
