"use client";

import { Menu, MessageCircle } from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import { currentSemester } from "@/const/semester";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetTrigger,
} from "@/components/ui/sheet";
import SideNav from "./SideNav";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const HelpDynamic = dynamic(() => import("@/components/Help/Help"), {
  ssr: false,
});

const GenericIssueFormDynamic = dynamic(
  () => import("@/components/Forms/GenericIssueFormDialog"),
  { ssr: false },
);

const SideNavDrawer = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side={"left"} className="w-[12rem]" closeIcon={false}>
        <SideNav />
      </SheetContent>
    </Sheet>
  );
};

const Header = () => {
  const { language } = useSettings();
  const currentWeek = useMemo(
    () =>
      currentSemester
        ? Math.floor(
            (new Date().getTime() - currentSemester.begins.getTime()) /
              (1000 * 60 * 60 * 24 * 7),
          ) + 1
        : null,
    [],
  );

  return (
    <header className="h-[--header-height] w-screen bg-white dark:bg-background shadow-md px-2 md:px-8 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4">
      <div className="flex flex-row gap-3 flex-1 items-center">
        {/* <SideNavDrawer/> */}
        <Link href={"/" + language + "/timetable"}>
          <NTHUModsLogo />
        </Link>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        {language == "en" &&
          (currentSemester
            ? `AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`
            : `Holiday`)}
        {language == "zh" &&
          (currentSemester
            ? `${currentSemester.year - 1911}-${currentSemester.semester} 學期, 第${currentWeek}週`
            : `假期`)}
      </p>
      <div className="flex gap-2">
        <HelpDynamic />
        <GenericIssueFormDynamic />
      </div>
    </header>
  );
};

export default Header;
