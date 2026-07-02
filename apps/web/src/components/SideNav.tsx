import * as I from "lucide-react";
import { FC, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { useSidebar } from "@courseweb/ui";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_SIDEBAR_NAV_ITEMS,
  SidebarNavItemConfig,
  SidebarNavItemId,
} from "@/app/[lang]/(mods-pages)/settings/SidebarNavSection";

const SideNav: FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { language } = useSettings();
  const dict = useDictionary();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const [navItems] = useLocalStorage<SidebarNavItemConfig[]>(
    "sidebar_nav_items",
    DEFAULT_SIDEBAR_NAV_ITEMS,
  );

  const allLinks: Record<
    SidebarNavItemId,
    { title: string; href: string; icon: JSX.Element; color: string }
  > = useMemo(
    () => ({
      today: {
        title: dict.navigation.today,
        href: `/${language}/today`,
        icon: <I.LayoutList strokeWidth="2" />,
        color: "#7EC96D",
      },
      timetable: {
        title: dict.navigation.timetable,
        href: `/${language}/timetable`,
        icon: <I.Calendar strokeWidth="2" />,
        color: "#E47B86",
      },
      bus: {
        title: dict.navigation.bus,
        href: `/${language}/bus`,
        icon: <I.Bus strokeWidth="2" />,
        color: "#EB8751",
      },
      apps: {
        title: dict.applist.title,
        href: `/${language}/apps`,
        icon: <I.LayoutGrid strokeWidth="2" />,
        color: "#AEA3C9",
      },
      settings: {
        title: dict.navigation.settings,
        href: `/${language}/settings`,
        icon: <I.Settings strokeWidth="2" />,
        color: "#B46DD6",
      },
    }),
    [dict, language],
  );

  const visibleLinks = useMemo(
    () =>
      navItems
        .filter((item) => item.enabled)
        .map((item) => ({ ...allLinks[item.id], id: item.id })),
    [navItems, allLinks],
  );

  const handleLinkClick = (href: string) => () => {
    if (isMobile) setOpenMobile(false);
    navigate(href);
  };

  return (
    <nav className="h-full w-full flex flex-col justify-start items-start gap-3">
      {visibleLinks.map((link) => (
        <div
          className={`w-full flex flex-row items-center justify-start gap-2 rounded-md cursor-pointer transition dark:text-slate-300 font-semibold px-3 py-1.5 ${link.href === pathname ? "bg-primary text-primary-foreground" : "text-slate-700 dark:text-slate-300 hover:bg-accent hover:text-accent-foreground"}`}
          key={link.id}
          onClick={handleLinkClick(link.href)}
        >
          <span className="w-6 h-6">{link.icon}</span>
          <span className="flex-1 font-semibold">{link.title}</span>
        </div>
      ))}
    </nav>
  );
};

export default SideNav;
