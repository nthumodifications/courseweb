"use client";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Header = () => {
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
