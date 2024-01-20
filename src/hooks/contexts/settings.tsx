"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
    FC,
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
} from "react";
import { useLocalStorage } from 'usehooks-ts';
import { useCookies } from 'react-cookie';
import { Language } from "@/types/settings";
import { apps } from "@/const/apps";
import { timetableColors } from "@/const/timetableColors";
import { event } from "@/lib/gtag";

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "zh",
    darkMode: false,
    timetableTheme: "pastelColors",
    pinnedApps: [],
    setLanguage: () => {},
    setDarkMode: () => {},
    setTimetableTheme: () => {},
    toggleApp: () => {}
});

type HeadlessAISStorage = { enabled: false } | {enabled: true, studentid: string, password: string, ACIXSTORE?: string, lastUpdated: number }
const useSettingsProvider = () => {
    const language = useParams().lang as Language;
    const router = useRouter();
    const pathname = usePathname();
    const [cookies, setCookie, removeCookie] = useCookies(['theme', 'locale', 'ACIXSTORE']);
    const [timetableTheme, setTimetableTheme] = useLocalStorage<string>("timetable_theme", "pastelColors");
    const [pinnedApps, setPinnedApps] = useLocalStorage<string[]>("pinned_apps", []);

    const setLanguage = (newLang: Language) => {
        //set cookie of 'locale'
        setCookie("locale", newLang, { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

    //migrate from old timetable theme to new one
    useLayoutEffect(() => {
        if(typeof window  == "undefined") return ;
        // if(timetableTheme == "tsinghuarian") {
        //     setTimetableTheme("pastelColors");
        // }
        const themes = Object.keys(timetableColors);
        if(!themes.includes(timetableTheme)) {
            setTimetableTheme(themes[0]);
        }
        event({
            action: "selected_theme",
            category: "theme",
            label: !themes.includes(timetableTheme) ? themes[0] : timetableTheme
        });
    }, [timetableTheme]);

    //check if cookies 'locale' exists, else set it
    useEffect(() => {
        if(typeof window  == "undefined") return ;
        //check locale from cookie
        const locale = cookies.locale;
        if(locale == undefined) {
            setCookie("locale", language, { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
        }
    }, [cookies, language]);

    useEffect(() => {
        if(typeof window  == "undefined") return ;
        //check theme from cookie
        const theme = cookies.theme;
        if(theme == undefined) {
            if(window.matchMedia('(prefers-color-scheme: dark)').matches){
                setCookie("theme", "dark", { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            }
            else {
                setCookie("theme", "light", { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            }
            window.localStorage.removeItem("joy-mode")
            window.location.reload();
        }
    }, [cookies]);

    const setDarkMode = (val: boolean) => {
        if(typeof window  == "undefined") return ;
        removeCookie("theme");
        setCookie("theme", val ? "dark" : "light", { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
        window.localStorage.removeItem("joy-mode")
        window.location.reload();
    }

    const darkMode = useMemo(() => cookies.theme == "dark", [cookies]);

    const toggleApp = (app: string) => {
        if(pinnedApps.includes(app)) {
            setPinnedApps(pinnedApps.filter(appId => appId != app));
        }
        else {
            setPinnedApps([...pinnedApps, app]);
        }
    }

    //cleanup pinned apps, remove apps that are not in the app list
    useEffect(() => {
        if(typeof window  == "undefined") return ;
        setPinnedApps(pinnedApps.filter(appId => apps.some(app => app.id == appId)));
    }, []);
    
    return {
        language,
        darkMode,
        timetableTheme,
        pinnedApps,
        setLanguage,
        setDarkMode,
        setTimetableTheme,
        toggleApp,
    };
}


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