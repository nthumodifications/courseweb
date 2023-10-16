'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { Divider, Option, Select, Slider, Switch } from "@mui/joy";


const SettingsPage = () => {

    const { darkMode, setDarkMode, language, setLanguage } = useSettings();
    const dict = useDictionary();

    return (
        <div className="flex flex-col max-w-2xl px-4">
            <h1 className="font-semibold text-3xl text-gray-400 py-3">{dict.settings.title}</h1>
            <Divider/>
            <div className="flex flex-row gap-4 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 pb-2">{dict.settings.dark_mode.title}</h2>
                    <p className="text-gray-600">{dict.settings.dark_mode.description}</p>
                </div>
                <div className="flex items-center">
                    <Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
                </div>
            </div>
            <Divider/>
            <div className="flex flex-row gap-4 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 pb-2">{dict.settings.language.title}</h2>
                    <p className="text-gray-600">{dict.settings.language.description}</p>
                </div>
                <div className="flex items-center">
                <Select defaultValue={language} value={language} onChange={(e,v) => setLanguage(v!)}>
                    <Option value="zh">繁體中文</Option>
                    <Option value="en">English</Option>
                </Select>
                </div>
            </div>
        </div>
    )
};

export default SettingsPage;