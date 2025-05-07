import SideNav from "@/components/SideNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";

import dynamic from "next/dynamic";

const HelpDynamic = dynamic(() => import("@/components/Help/Help"));

const GenericIssueFormDynamic = dynamic(
  () => import("@/components/Forms/GenericIssueFormDialog"),
);

const MinifiedUpcomingEventsDynamic = dynamic(
  () => import("@/components/Calendar/MinifiedUpcomingEvents"),
);

const AppSidebar = () => {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <NTHUModsLogo />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SideNav />
      </SidebarContent>
      <SidebarFooter className="flex flex-col">
        <div className="border-t border-border pt-2">
          <MinifiedUpcomingEventsDynamic />
        </div>
        <div className="flex flex-row justify-stretch gap-2 mt-2">
          <HelpDynamic />
          <GenericIssueFormDynamic />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
