import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import { useCookies } from "react-cookie";
import { Language } from "@/types/settings";
import { apps } from "@/const/apps";

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
  language: "zh",
  darkMode: false,
  pinnedApps: [],
  showAcademicCalendar: true,
  setShowAcademicCalendar: () => {},
  setLanguage: () => {},
  setDarkMode: () => {},
  setTimetableTheme: () => {},
  toggleApp: () => {},
  analytics: true,
  setAnalytics: () => {},
});

type HeadlessAISStorage =
  | { enabled: false }
  | {
      enabled: true;
      studentid: string;
      password: string;
      ACIXSTORE?: string;
      lastUpdated: number;
    };
const useSettingsProvider = () => {
  const language = useParams().lang as Language;
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [cookies, setCookie, removeCookie] = useCookies([
    "theme",
    "locale",
    "ACIXSTORE",
  ]);
  const [timetableTheme, setTimetableTheme] = useLocalStorage<string>(
    "timetable_theme",
    "pastelColors",
  );
  const [pinnedApps, setPinnedApps] = useLocalStorage<string[]>(
    "pinned_apps",
    [],
  );
  const [analytics, setAnalytics] = useLocalStorage<boolean>("analytics", true);
  const [showAcademicCalendar, setShowAcademicCalendar] =
    useLocalStorage<boolean>("show_academic_calendar", true);

  const setLanguage = (newLang: Language) => {
    //set cookie of 'locale'
    setCookie("locale", newLang, {
      path: "/",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    navigate(`/${newLang}/` + pathname.split("/").slice(2).join("/"));
  };

  //check if cookies 'locale' exists, else set it
  useEffect(() => {
    if (typeof window == "undefined") return;
    //check locale from cookie
    const locale = cookies.locale;
    if (locale == undefined) {
      setCookie("locale", language, {
        path: "/",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }
  }, [cookies, language]);

  useEffect(() => {
    if (typeof window == "undefined") return;
    //check theme from cookie
    const theme = cookies.theme;
    if (theme == undefined) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setCookie("theme", "dark", {
          path: "/",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        setCookie("theme", "light", {
          path: "/",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, [cookies]);

  const setDarkMode = (val: boolean) => {
    if (typeof window == "undefined") return;
    removeCookie("theme");
    setCookie("theme", val ? "dark" : "light", {
      path: "/",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    // set html class to theme
    if (val) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  const darkMode = useMemo(() => cookies.theme == "dark", [cookies]);

  const toggleApp = (app: string) => {
    if (pinnedApps.includes(app)) {
      setPinnedApps(pinnedApps.filter((appId) => appId != app));
    } else {
      setPinnedApps([...pinnedApps, app]);
    }
  };

  //cleanup pinned apps, remove apps that are not in the app list
  useEffect(() => {
    if (typeof window == "undefined") return;
    setPinnedApps(
      pinnedApps.filter((appId) => apps.some((app) => app.id == appId)),
    );
  }, []);

  return {
    language,
    darkMode,
    pinnedApps,
    showAcademicCalendar,
    setShowAcademicCalendar,
    setLanguage,
    setDarkMode,
    setTimetableTheme,
    toggleApp,
    analytics,
    setAnalytics,
  };
};

const useSettings = () => useContext(settingsContext);

const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
  const settings = useSettingsProvider();

  return (
    <settingsContext.Provider value={settings}>
      {children}
    </settingsContext.Provider>
  );
};

export { useSettings, SettingsProvider };
