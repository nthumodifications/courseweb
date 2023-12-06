"use client";;
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import { useLocalStorage } from 'usehooks-ts';
import { useCookies } from 'react-cookie';
import { Language } from "@/types/settings";
import { RawCourseID } from "@/types/courses";
import { apps } from "@/const/apps";

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "zh",
    darkMode: false,
    timetableTheme: "pastelColors",
    pinnedApps: [],
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    setLanguage: () => {},
    setDarkMode: () => {},
    setTimetableTheme: () => {},
    setAISCredentials: () => {},
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

    const setLanguage = (newLang: Language) => {
        //set cookie of 'locale'
        setCookie("locale", newLang, { path: '/' });
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

    //migrate from old timetable theme to new one
    useLayoutEffect(() => {
        if(typeof window  == "undefined") return ;
        if(timetableTheme == "tsinghuarian") {
            setTimetableTheme("pastelColors");
        }
    }, [timetableTheme]);

    //check if cookies 'locale' exists, else set it
    useEffect(() => {
        if(typeof window  == "undefined") return ;
        //check locale from cookie
        const locale = cookies.locale;
        if(locale == undefined) {
            setCookie("locale", language, { path: '/' });
        }
    }, [cookies, language]);

    useEffect(() => {
        if(typeof window  == "undefined") return ;
        //check theme from cookie
        const theme = cookies.theme;
        if(theme == undefined) {
            if(window.matchMedia('(prefers-color-scheme: dark)').matches){
                setCookie("theme", "dark", { path: '/' });
            }
            else {
                setCookie("theme", "light", { path: '/' });
            }
            window.localStorage.removeItem("joy-mode")
            window.location.reload();
        }
    }, [cookies]);

    const setDarkMode = (val: boolean) => {
        if(typeof window  == "undefined") return ;
        removeCookie("theme");
        setCookie("theme", val ? "dark" : "light", { path: '/' })
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
        if(!username || !password) {
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

    const updateACIXSTORE = () => {
        if(!headlessAIS.enabled) return ;
        if(headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now()) return ;
        //fetch /api/ais_headless to get ACIXSTORE
        const form = new FormData();
        form.append("studentid", headlessAIS.studentid);
        form.append("password", headlessAIS.password);
        fetch("/api/ais_headless/login", {
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
            } else {
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: undefined
                });
                //remove cookie
                removeCookie("ACIXSTORE");
            }
        })
    }

    //update ACIXSTORE
    useEffect(() => {
        //every 15 minutes
        if(typeof window  == "undefined") return ;
        if(!headlessAIS.enabled) return ;
        const interval = setInterval(updateACIXSTORE, 15 * 60 * 1000);
        updateACIXSTORE();
        return () => clearInterval(interval);
    }, [headlessAIS]);

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
        toggleApp
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