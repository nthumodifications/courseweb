'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import {  useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import LoginDialog from "@/components/Forms/LoginDialog";
import { TimetableThemeList } from "./TimetableThemeList";
import TimetablePreview from "./TimetablePreview";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Language } from "@/types/settings";
import Footer from '@/components/Footer';

const SettingsPage = () => {

    const { darkMode, setDarkMode, language, setLanguage } = useSettings();
    const { ais } = useHeadlessAIS();
    const [dummy, setDummy] = useState(0);
    const dict = useDictionary();

    //Workaround for darkmode value not syncing with the MUI state.  
    useEffect(() => {
        setDummy(dummy + 1);
    },[darkMode]);

    return (
        <div className="flex flex-col max-w-2xl px-4">
            <h1 className="font-semibold text-3xl text-gray-400 py-3">{dict.settings.title}</h1>
            <Separator orientation="horizontal"/>
            <div className="flex flex-row gap-4 py-4" id="darkmode">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.dark_mode.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.dark_mode.description}</p>
                </div>
                {<div className="flex items-center">
                    <Switch key={dummy} checked={darkMode} defaultChecked={darkMode} onCheckedChange={(e) => setDarkMode(e)}/>
                </div>}
            </div>
            <Separator orientation="horizontal"/>
            <div className="flex flex-row gap-4 py-4" id="language">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.language.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.language.description}</p>
                </div>
                <div className="flex items-center">
                <Select defaultValue={language} value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={dict.settings.language.description} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="zh">繁體中文</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                </Select>

                </div>
            </div>
            <Separator orientation="horizontal"/>
            <div className="flex flex-col gap-4 py-4" id="theme">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.theme.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.theme.description}</p>
                </div>
                <TimetablePreview/>
                <TimetableThemeList/>
            </div>
            <Separator orientation="horizontal"/>
            <div className="flex flex-row gap-4 py-4" id="headless_ais">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.ccxp.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.ccxp.description}</p>
                    {/* <CCXPDownAlert/> */}
                </div>
                <div className="flex flex-col justify-center items-center space-y-2 w-52">
                    {/*<Button variant="outlined" color="primary" onClick={handleOpenHeadlessLogin}>連接</Button>*/}
                    <LoginDialog />
                    {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">{dict.ccxp.connected}</span>}
                    {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">{dict.ccxp.failed}</span>}
                </div>
            </div>
            <Separator orientation="horizontal"/>
            <Footer/>
        </div>
    )
};

export default SettingsPage;