"use client";
import { useSettings } from "@/hooks/contexts/settings";
import dynamic from "next/dynamic";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import LoginDialog from "./Forms/LoginDialog";
import { Button } from "./ui/button";
import {
  HelpCircle,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  University,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useLaunchApp from "@/hooks/useLaunchApp";
import { apps } from "@/const/apps";
import { auth } from "@/config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const HelpDynamic = dynamic(() => import("@/components/Help/Help"), {
  ssr: false,
});

const GenericIssueFormDynamic = dynamic(
  () => import("@/components/Forms/GenericIssueFormDialog"),
  { ssr: false },
);

const Header = () => {
  const { language } = useSettings();
  const { user, signOut } = useHeadlessAIS();
  const dict = useDictionary();
  const ccxpApp = apps.find((app) => app.id === "ccxp")!;
  const [onItemClicked, aisLoading, cancelLoading] = useLaunchApp(ccxpApp);
  const [_, authloading, autherror] = useAuthState(auth);

  return (
    <header className="h-[--header-height] w-full bg-white dark:bg-background shadow-md px-2 md:px-4 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4 sticky top-0">
      <SidebarTrigger />
      <div className="flex flex-1">
        <CurrentSemesterLabel />
      </div>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="text-left">
              <div className="text-sm">{user.name_zh}</div>
              <div className="text-xs text-gray-500">{user.department}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <div className="text-sm">{user.name_zh}</div>
                <div className="text-xs">{user.name_en}</div>
                <div className="text-xs">{user.studentid}</div>
                <div className="text-xs text-gray-500">{user.department}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onItemClicked} disabled={aisLoading}>
              <University className="w-4 h-4 mr-2" />
              {aisLoading ? (
                <Loader2 className="animate-spin" />
              ) : language == "zh" ? (
                ccxpApp.title_zh
              ) : (
                ccxpApp.title_en
              )}
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator /> */}

            {/* Triggering will result in unmounting, thus we will disable for now. */}
            {/* <HelpDynamic>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 w-4 h-4" />
                Help
              </DropdownMenuItem>
            </HelpDynamic>

            <GenericIssueFormDynamic>
              <DropdownMenuItem>
                <MessageCircle className="mr-2 w-4 h-4" />
                Feedback
              </DropdownMenuItem>
            </GenericIssueFormDynamic> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="w-4 h-4 mr-2" />
              <span onClick={signOut}>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {user == null && !authloading && (
        <LoginDialog>
          <Button size="sm" variant="outline">
            {dict.settings.account.signin} <LogIn className="w-4 h-4" />
          </Button>
        </LoginDialog>
      )}
    </header>
  );
};

export default Header;
