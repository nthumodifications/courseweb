"use client";;
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useLayoutEffect, useMemo } from "react";
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
    pinnedApps: [],
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    setLanguage: () => {},
    setDarkMode: () => {},
    setAISCredentials: () => {},
    updateACIXSTORE: () => {},
    toggleApp: () => {}
});

type HeadlessAISStorage = { enabled: false } | {enabled: true, studentid: string, password: string, ACIXSTORE?: string, lastUpdated: number }
const useSettingsProvider = () => {
    const language = useParams().lang as Language;
    const router = useRouter();
    const pathname = usePathname();
    const [cookies, setCookie, removeCookie] = useCookies(['theme', 'locale', 'ACIXSTORE']);
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", { enabled: false });
    const [pinnedApps, setPinnedApps] = useLocalStorage<string[]>("pinned_apps", []);

    const setLanguage = (newLang: Language) => {
        //set cookie of 'locale'
        setCookie("locale", newLang, { path: '/', expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

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
        return;
        // if(!username || !password) {
        //     removeCookie("ACIXSTORE", { path: '/' });
        //     setHeadlessAIS({
        //         enabled: false
        //     });
        //     return ;
        // }
        // setHeadlessAIS({
        //     enabled: true,
        //     studentid: username,
        //     password: password,
        //     ACIXSTORE: "",
        //     lastUpdated: 0
        // });
    }

    const updateACIXSTORE = () => {
        return;
        // if(!headlessAIS.enabled) return ;
        // if(headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now()) return ;
        // //fetch /api/ais_headless to get ACIXSTORE
        // const form = new FormData();
        // form.append("studentid", headlessAIS.studentid);
        // form.append("password", headlessAIS.password);
        // fetch("/api/ais_headless/login", {
        //     method: "POST",
        //     body: form
        // })
        // .then(res => res.json())
        // .then(res => {
        //     if(res.success) {
        //         setHeadlessAIS({
        //             ...headlessAIS,
        //             ACIXSTORE: res.body.ACIXSTORE,
        //             lastUpdated: Date.now()
        //         });
        //         //set cookie
        //         setCookie("ACIXSTORE", res.body.ACIXSTORE, { path: '/', expires: new Date(Date.now() + 15 * 60 * 1000) });
        //     } else {
        //         setHeadlessAIS({
        //             ...headlessAIS,
        //             ACIXSTORE: undefined
        //         });
        //         //remove cookie
        //         removeCookie("ACIXSTORE", { path: '/'});
        //     }
        // })
    }

    // //update ACIXSTORE
    // useEffect(() => {
    //     //every 15 minutes
    //     if(typeof window  == "undefined") return ;
    //     if(!headlessAIS.enabled) return ;
    //     // only update when pathname starts with /apps or /settings
    //     // if(!pathname.startsWith("/apps") && !pathname.startsWith("/settings")) return ;
    //     const interval = setInterval(updateACIXSTORE, 15 * 60 * 1000);
    //     updateACIXSTORE();
    //     return () => clearInterval(interval);
    // }, [headlessAIS]);

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
        pinnedApps,
        ais,
        setLanguage,
        setDarkMode,
        setAISCredentials,
        updateACIXSTORE,
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