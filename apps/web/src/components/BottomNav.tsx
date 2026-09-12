import * as I from "lucide-react";
import { FC, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { Separator } from "@courseweb/ui";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_NAV_ITEMS,
  NavItemConfig,
  NavItemId,
} from "@/app/[lang]/(mods-pages)/settings/BottomNavSection";

const BottomNav: FC = () => {
  const { pathname } = useLocation();
  const { language } = useSettings();
  const dict = useDictionary();
  const navigate = useNavigate();
  const [navItems] = useLocalStorage<NavItemConfig[]>(
    "bottom_nav_items",
    DEFAULT_NAV_ITEMS,
  );

  const allLinks: Record<
    NavItemId,
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
    [language, dict],
  );

  const visibleLinks = useMemo(
    () =>
      navItems
        .filter((item) => item.enabled)
        .map((item) => ({ ...allLinks[item.id], id: item.id })),
    [navItems, allLinks],
  );

  const colCount = visibleLinks.length || 4;

  return (
    <div className="fixed bottom-0 z-50 flex h-[var(--bottom-nav-height)] w-full flex-col bg-background md:hidden">
      <Separator />
      <nav
        className="grid items-center py-2"
        aria-label={dict.navigation.bottom_aria}
        style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
      >
        {visibleLinks.map((link) => (
          <button
            type="button"
            className={`flex min-h-10 flex-col items-center justify-center gap-1 rounded-md px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${link.href === pathname ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            key={link.id}
            onClick={() => navigate(link.href)}
            aria-current={link.href === pathname ? "page" : undefined}
          >
            <span className="w-6 h-6">{link.icon}</span>
            <span className="text-xs font-semibold select-none">
              {link.title}
            </span>
          </button>
        ))}
      </nav>
      <Separator />
    </div>
  );
};

export default BottomNav;
