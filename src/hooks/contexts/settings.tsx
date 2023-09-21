"use client";
import { FC, PropsWithChildren, createContext, useContext, useState } from "react";

type Languages = "tw" | "en";

type SettingsType = {
    language: Languages;
    darkMode: boolean;
};

type SettingsContextType = SettingsType & {
    setSettings: (settings: SettingsType) => void;
};

const settingsContext = createContext<SettingsContextType>({
    language: "tw",
    darkMode: false,
    setSettings: () => {},
});

const useSettingsProvider = () => {
    const [language, setLanguage] = useState<Languages>("tw");
    const [darkMode, setDarkMode] = useState(false);

    const setSettings = (settings: SettingsType) => {
        setLanguage(settings.language);
        setDarkMode(settings.darkMode);
    };

    return {
        language,
        darkMode,
        setSettings,
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