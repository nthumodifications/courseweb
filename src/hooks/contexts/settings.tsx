"use client";;
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
import { useCookies } from 'react-cookie';
import { Language } from "@/types/settings";
import { RawCourseID } from "@/types/courses";
import { apps } from "@/const/apps";
import { timetableColors } from "@/const/timetableColors";
import { event } from "@/lib/gtag";

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "zh",
    darkMode: false,
    timetableTheme: "pastelColors",
    pinnedApps: [],
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    initializing: true,
    setLanguage: () => {},
    setDarkMode: () => {},
    setTimetableTheme: () => {},
    setAISCredentials: () => {},
    getACIXSTORE: async () => null,
    toggleApp: () => {}
});

type HeadlessAISStorage = { enabled: false } | {enabled: true, studentid: string, password: string, ACIXSTORE?: string, lastUpdated: number }
const useSettingsProvider = () => {
    const language = useParams().lang as Language;
    const router = useRouter();
    const pathname = usePathname();
    const [cookies, setCookie, removeCookie] = useCookies(['theme', 'locale', 'ACIXSTORE']);
    const [timetableTheme, setTimetableTheme] = useLocalStorage<string>("timetable_theme", "pastelColors");
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", { enabled: false });
    const [pinnedApps, setPinnedApps] = useLocalStorage<string[]>("pinned_apps", []);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => { setInitializing(false) }, []);

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

    //Headless AIS
    const setAISCredentials = (username?: string, password?: string) => {
        // return;
        if(!username || !password) {
            removeCookie("ACIXSTORE", { path: '/' });
            setHeadlessAIS({
                enabled: false
            });
            return ;
        }
        setHeadlessAIS({
            enabled: true,
            studentid: username,
            password: password,
            ACIXSTORE: "",
            lastUpdated: 0
        });
    }

    /**
     * 
     * @param force force update ACIXSTORE
     * @returns ACIXSTORE or null if error, undefined if not enabled
     */
    const getACIXSTORE = async (force = false) => {
        // return;
        if(!headlessAIS.enabled) return undefined;
        if(headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now() && !force ) return headlessAIS.ACIXSTORE ?? null;
        //fetch /api/ais_headless to get ACIXSTORE
        const form = new FormData();
        form.append("studentid", headlessAIS.studentid);
        form.append("password", headlessAIS.password);
        return await fetch("/api/ais_headless/login", {
            method: "POST",
            body: form
        })
        .then(res => res.json())
        .then(res => {
            if(res.success) {
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: res.body.ACIXSTORE,
                    lastUpdated: Date.now()
                });
                //set cookie
                setCookie("ACIXSTORE", res.body.ACIXSTORE, { path: '/', expires: new Date(Date.now() + 15 * 60 * 1000) });
                return res.body.ACIXSTORE as string;
            } else {
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: undefined
                });
                return null;
                //remove cookie
                removeCookie("ACIXSTORE", { path: '/'});
            }
        })
    }

    useEffect(() => {
        getACIXSTORE(true);
    //@ts-ignore
    }, [headlessAIS.enabled, headlessAIS.studentid, headlessAIS.password]);

    //cleanup pinned apps, remove apps that are not in the app list
    useEffect(() => {
        if(typeof window  == "undefined") return ;
        setPinnedApps(pinnedApps.filter(appId => apps.some(app => app.id == appId)));
    }, []);
    
    const ais = {
        ACIXSTORE: headlessAIS.enabled ? headlessAIS.ACIXSTORE : undefined,
        enabled: headlessAIS.enabled,
    }
    
    return {
        language,
        darkMode,
        timetableTheme,
        pinnedApps,
        ais,
        setLanguage,
        setDarkMode,
        setTimetableTheme,
        setAISCredentials,
        getACIXSTORE,
        toggleApp,
        initializing
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