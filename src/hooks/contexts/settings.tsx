"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
import { useCookies } from 'react-cookie';
import { useColorScheme } from "@mui/joy";

type Languages = "zh" | "en";

type SettingsType = {
    language: Languages;
    darkMode: boolean;
    courses: string[];
};

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "zh",
    darkMode: false,
    courses: [],
    setSettings: () => {},
    setCourses: () => {},
    setLanguage: () => {},
    setDarkMode: () => {}
});

const useSettingsProvider = () => {
    const language = useParams().lang as Languages;
    const router = useRouter();
    const pathname = usePathname();
    const [cookies, setCookie, removeCookie] = useCookies(['theme']);
    const [courses, setCourses] = useLocalStorage<string[]>("semester_1121", []);

    const setSettings = (settings: SettingsType) => {
        setCourses(settings.courses);
    };

    const setLanguage = (newLang: Languages) => {
        console.log(pathname);
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

    useEffect(() => {
        if(typeof window  == "undefined") return ;
        //check theme from cookie
        const theme = cookies.theme;
        if(theme == undefined) {
            if(window.matchMedia('(prefers-color-scheme: dark)').matches){
                setCookie("theme", "dark");
            }
            else {
                setCookie("theme", "light");
            }
            window.localStorage.removeItem("joy-mode")
            window.location.reload();
        }
    }, [cookies]);

    const setDarkMode = (val: boolean) => {
        if(typeof window  == "undefined") return ;
        removeCookie("theme");
        setCookie("theme", val ? "dark" : "light")
        window.localStorage.removeItem("joy-mode")
        window.location.reload();
    }

    return {
        language,
        get darkMode() {
            return cookies.theme == "dark";
        },
        courses,
        setSettings,
        setCourses,
        setLanguage,
        setDarkMode
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