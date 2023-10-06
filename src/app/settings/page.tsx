'use client';
import { useSettings } from "@/hooks/contexts/settings";
import { Divider, Option, Select, Slider, Switch } from "@mui/joy";

const SettingsPage = () => {

    const { darkMode, setDarkMode, language, setLanguage } = useSettings();


    return (
        <div className="flex flex-col max-w-2xl">
            <h1 className="font-semibold text-3xl text-gray-400 py-3">Settings</h1>
            <Divider/>
            <div className="flex flex-row gap-4 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 pb-2">Dark Mode</h2>
                    <p className="text-gray-600">Night mode turns the light surfaces of the page dark, creating an experience ideal for the dark. Try it out!</p>
                </div>
                <div className="flex items-center">
                    <Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
                </div>
            </div>
            <Divider/>
            <div className="flex flex-row gap-4 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 pb-2">Language</h2>
                    <p className="text-gray-600">Night mode turns the light surfaces of the page dark, creating an experience ideal for the dark. Try it out!</p>
                </div>
                <div className="flex items-center">
                <Select defaultValue={language} value={language} onChange={(e,v) => setLanguage(v!)}>
                    <Option value="tw">繁體中文</Option>
                    <Option value="en">English</Option>
                </Select>
                </div>
            </div>
        </div>
    )
};

export default SettingsPage;