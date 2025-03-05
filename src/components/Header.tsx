"use client";
import { useSettings } from "@/hooks/contexts/settings";
import dynamic from "next/dynamic";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import useDictionary from "@/dictionaries/useDictionary";
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
  const dict = useDictionary();
  const [_, authloading, autherror] = useAuthState(auth);

  return (
    <header className="h-[--header-height] w-full bg-white dark:bg-background shadow-md px-2 md:px-4 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4 sticky top-0">
      <SidebarTrigger />
      <div className="flex flex-1">
        <CurrentSemesterLabel />
      </div>
    </header>
  );
};

export default Header;
