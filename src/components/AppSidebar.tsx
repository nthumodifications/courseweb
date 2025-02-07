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

const AppSidebar = () => {
  return (
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
  );
};

export default AppSidebar;
