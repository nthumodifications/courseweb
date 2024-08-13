"use client";
import * as I from "lucide-react";
import { FC, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Route } from "next";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";

const SideNav: FC = () => {
  const pathname = usePathname();
  const { language } = useSettings();
  const dict = useDictionary();
  const router = useRouter();
  const links: {
    title: string;
    href: Route;
    icon: JSX.Element;
    color: string;
  }[] = useMemo(
    () => [
      {
        title: dict.navigation.today,
        href: `/${language}/today`,
        icon: <I.LayoutList strokeWidth="2" />,
        color: "#7EC96D",
      },
      {
        title: dict.navigation.timetable,
        href: `/${language}/timetable`,
        icon: <I.Calendar strokeWidth="2" />,
        color: "#E47B86",
      },
      {
        title: dict.navigation.courses,
        href: `/${language}/courses`,
        icon: <I.BookOpen strokeWidth="2" />,
        color: "#7BC2CF",
      },
      {
        title: dict.navigation.bus,
        href: `/${language}/bus`,
        icon: <I.Bus strokeWidth="2" />,
        color: "#EB8751",
      },
      {
        title: dict.applist.title,
        href: `/${language}/apps`,
        icon: <I.LayoutGrid strokeWidth="2" />,
        color: "#AEA3C9",
      },
      {
        title: dict.navigation.settings,
        href: `/${language}/settings`,
        icon: <I.Settings strokeWidth="2" />,
        color: "#B46DD6",
      },
    ],
    [dict, language],
  );

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [links, router]);

  return (
    <nav className="h-full w-full flex flex-col justify-start items-start gap-3">
      {links.map((link, index) => (
        <div
          className={`w-full flex flex-row items-center justify-start gap-2 rounded-md cursor-pointer transition dark:text-slate-300 font-semibold px-3 py-1.5 ${link.href == pathname ? "text-white  bg-nthu-600" : "text-slate-700"}`}
          key={index}
          onClick={() => router.push(link.href)}
        >
          <span className="w-6 h-6">{link.icon}</span>
          <span className="flex-1 font-semibold">{link.title}</span>
        </div>
      ))}
    </nav>
  );
};

export default SideNav;
