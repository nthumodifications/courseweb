'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { useModal } from "@/hooks/contexts/useModal";
import { Button, Divider, Option, Select, Switch } from "@mui/joy";
import {  useEffect, useState } from "react";
import NTHULoginButton from "../cds/NTHULoginButton";
import { signOut, useSession } from "next-auth/react";
import { HeadlessLoginDialog } from "../../../components/Forms/HeadlessLoginDialog";
import { TimetableThemeList } from "./TimetableThemeList";
import TimetablePreview from "./TimetablePreview";

const SettingsPage = () => {

    const { darkMode, setDarkMode, language, setLanguage, ais } = useSettings();
    const [dummy, setDummy] = useState(0);
    const { data, status } = useSession();

    
    const dict = useDictionary();

    //Workaround for darkmode value not syncing with the MUI state.  
    useEffect(() => {
        setDummy(dummy + 1);
    },[darkMode]);

    const [openModal, closeModal] = useModal();

    const handleOpenHeadlessLogin = () => {
        openModal({
            children: <HeadlessLoginDialog onClose={closeModal}/>,
        })
    }
    return (
        <div className="flex flex-col max-w-2xl px-4">
            <h1 className="font-semibold text-3xl text-gray-400 py-3">{dict.settings.title}</h1>
            <Divider/>
            <div className="flex flex-row gap-4 py-4" id="darkmode">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.dark_mode.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.dark_mode.description}</p>
                </div>
                {<div className="flex items-center">
                    <Switch key={dummy} checked={darkMode} defaultChecked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
                </div>}
            </div>
            <Divider/>
            <div className="flex flex-row gap-4 py-4" id="language">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.language.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.language.description}</p>
                </div>
                <div className="flex items-center">
                <Select defaultValue={language} value={language} onChange={(e,v) => setLanguage(v!)}>
                    <Option value="zh">繁體中文</Option>
                    <Option value="en">English</Option>
                </Select>
                </div>
            </div>
            <Divider/>
            <div className="flex flex-col gap-4 py-4" id="theme">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{dict.settings.theme.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{dict.settings.theme.description}</p>
                </div>
                {/* TODO: Timetable Preview */}
                <TimetablePreview/>
                <TimetableThemeList/>
            </div>
            {/* <Divider/>
            <div className="flex flex-row gap-4 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">清華大學OAuth 賬號</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        NTHUMods 使用清華大學OAuth 賬號登入，以便獲取學生的學號、姓名等資訊。
                    </p>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 w-52">
                    {status == "loading" && <span className="text-gray-600 dark:text-gray-400">Loading...</span>}
                    {status == "authenticated" && <>
                        <span className="text-gray-600 dark:text-gray-400">登入為 {data.user.name_zh}</span>
                        <Button variant="soft" onClick={() => signOut()}>登出</Button>
                    </>}
                    {status == "unauthenticated" && <span className="text-gray-600 dark:text-gray-400"><NTHULoginButton/></span>}
                </div>
            </div> */}
            <Divider/>
            <div className="flex flex-row gap-4 py-4" id="headless_ais">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">代理登入校務資訊系統</h2>
                    <p className="text-gray-600 dark:text-gray-400">系統會用代理登入方式，讓學生們可以在NTHUMods 上輕鬆鏈接校務系統功能。</p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-2 w-52">
                    <Button variant="outlined" color="primary" onClick={handleOpenHeadlessLogin}>連接</Button>
                    {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">已連接</span>}
                    {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">連接著/登入異常</span>}
                </div>
            </div>
        </div>
    )
};

export default SettingsPage;