import * as I from "lucide-react";
import { FC, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { cn, useSidebar } from "@courseweb/ui";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_SIDEBAR_NAV_ITEMS,
  SidebarNavItemConfig,
  SidebarNavItemId,
} from "@/app/[lang]/(mods-pages)/settings/SidebarNavSection";
import { useAdminIdentity } from "@/app/[lang]/admin/api";

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
  // Staff-only, and deliberately outside the configurable list above: the admin
  // center is not something a student can turn on, so it has no business being
  // a row in the sidebar settings everyone sees.
  const { data: adminIdentity } = useAdminIdentity();

  const allLinks: Record<
    SidebarNavItemId,
    { title: string; href: string; icon: JSX.Element }
  > = useMemo(
    () => ({
      today: {
        title: dict.navigation.today,
        href: `/${language}/today`,
        icon: <I.LayoutList strokeWidth="2" />,
      },
      timetable: {
        title: dict.navigation.timetable,
        href: `/${language}/timetable`,
        icon: <I.Calendar strokeWidth="2" />,
      },
      bus: {
        title: dict.navigation.bus,
        href: `/${language}/bus`,
        icon: <I.Bus strokeWidth="2" />,
      },
      apps: {
        title: dict.applist.title,
        href: `/${language}/apps`,
        icon: <I.LayoutGrid strokeWidth="2" />,
      },
      settings: {
        title: dict.navigation.settings,
        href: `/${language}/settings`,
        icon: <I.Settings strokeWidth="2" />,
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

  const adminHref = `/${language}/admin`;
  const isAdminRoute = pathname.startsWith(adminHref);

  const handleLinkClick = (href: string) => () => {
    if (isMobile) setOpenMobile(false);
    navigate(href);
  };

  return (
    <nav className="h-full w-full flex flex-col justify-start items-start gap-4">
      {visibleLinks.map((link) => (
        <div
          className={`w-full flex flex-row items-center justify-start gap-2 rounded-md cursor-pointer transition font-medium px-3 py-2 ${link.href === pathname ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"}`}
          key={link.id}
          onClick={handleLinkClick(link.href)}
        >
          <span className="w-6 h-6">{link.icon}</span>
          <span className="flex-1 font-medium">{link.title}</span>
        </div>
      ))}

      {adminIdentity?.isAdmin && (
        // A real button rather than the clickable div the rows above use: this
        // one is new, and a div with an onClick is unreachable by keyboard.
        <button
          type="button"
          className={cn(
            "w-full flex flex-row items-center justify-start gap-2 rounded-md cursor-pointer transition font-medium px-3 py-2",
            isAdminRoute
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={handleLinkClick(adminHref)}
        >
          <span className="w-6 h-6">
            <I.ShieldCheck strokeWidth="2" />
          </span>
          <span className="flex-1 text-left font-medium">{dict.navigation.admin}</span>
        </button>
      )}
    </nav>
  );
};

export default SideNav;
