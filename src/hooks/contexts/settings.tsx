"use client";
import { FC, PropsWithChildren, createContext, useContext, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
type Languages = "tw" | "en";

type SettingsType = {
    language: Languages;
    darkMode: boolean;
    courses: string[];
};

const settingsContext = createContext<ReturnType<typeof useSettingsProvider>>({
    language: "tw",
    darkMode: false,
    courses: [],
    setSettings: () => {},
    setCourses: () => {}
});

const useSettingsProvider = () => {
    const [language, setLanguage] = useLocalStorage<Languages>("language", "tw");
    const [darkMode, setDarkMode] = useLocalStorage("darkMode",false);
    const [courses, setCourses] = useLocalStorage<string[]>("courses", []);

    const setSettings = (settings: SettingsType) => {
        setLanguage(settings.language);
        setDarkMode(settings.darkMode);
        setCourses(settings.courses);
    };

    return {
        language,
        darkMode,
        courses,
        setSettings,
        setCourses
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