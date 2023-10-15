"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import { FC, PropsWithChildren, createContext, useContext, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
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
    const [darkMode, setDarkMode] = useLocalStorage("darkMode",false);
    const [courses, setCourses] = useLocalStorage<string[]>("courses", []);

    const setSettings = (settings: SettingsType) => {
        setDarkMode(settings.darkMode);
        setCourses(settings.courses);
    };

    const setLanguage = (newLang: Languages) => {
        console.log(pathname);
        router.push(`/${newLang}/`+pathname.split('/').slice(2).join('/'));
    };

    return {
        language,
        darkMode,
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