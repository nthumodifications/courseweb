"use client";
import * as I from "lucide-react";
import { FC, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Route } from "next";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { Separator } from "@/components/ui/separator";

const BottomNav: FC = () => {
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
    [language, dict],
  );

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [links, router]);

  return (
    <div className="fixed w-full bottom-0 md:hidden flex-col h-[5rem] bg-background z-50 flex">
      <Separator />
      <nav className="grid grid-cols-5 items-center py-2.5">
        {links.map((link, index) => (
          <div
            className={`flex flex-col items-center gap-1 ${link.href == pathname ? "text-primary" : "text-gray-400"}`}
            key={index}
            onClick={() => router.push(link.href)}
          >
            <span className="w-6 h-6">{link.icon}</span>
            <span className="text-xs font-semibold select-none">
              {link.title}
            </span>
          </div>
        ))}
      </nav>
      <Separator />
    </div>
  );
};

export default BottomNav;
