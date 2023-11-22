"use client";;
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorage } from 'usehooks-ts';
import { useCookies } from 'react-cookie';
import { Language } from "@/types/settings";
import { RawCourseID } from "@/types/courses";

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "zh",
    darkMode: false,
    timetableTheme: "tsinghuarian",
    setLanguage: () => {},
    setDarkMode: () => {},
    setTimetableTheme: () => {}
});

const useSettingsProvider = () => {
    const language = useParams().lang as Language;
    const router = useRouter();
    const pathname = usePathname();
    const [cookies, setCookie, removeCookie] = useCookies(['theme', 'locale']);
    const [timetableTheme, setTimetableTheme] = useLocalStorage<string>("timetable_theme", "tsinghuarian");

    const setLanguage = (newLang: Language) => {
        //set cookie of 'locale'
        setCookie("locale", newLang, { path: '/' });
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

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

    return {
        language,
        darkMode,
        timetableTheme,
        setLanguage,
        setDarkMode,
        setTimetableTheme
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