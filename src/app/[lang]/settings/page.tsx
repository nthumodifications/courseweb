'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { timetableColors } from "@/helpers/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { useModal } from "@/hooks/contexts/useModal";
import { Button, DialogActions, DialogContent, DialogTitle, Divider, Input, ModalClose, ModalDialog, Option, Select, Switch } from "@mui/joy";
import {  useEffect, useState } from "react";

const TimetableThemePreview = ({ theme, onClick = () => {}, selected = false }: { theme: string, selected?: boolean, onClick?: () => void}) => {
    return <div 
        onClick={onClick}
        className={`flex flex-col rounded-lg p-3 hover:dark:bg-neutral-800 hover:bg-gray-100 transition cursor-pointer space-y-2 ${selected? "bg-gray-100 dark:bg-neutral-800":""}`}>
        <div className="flex flex-row">
            {timetableColors[theme].map((color, index) => (
                <div className="flex-1 h-6 w-6" style={{background: color}} key={index}/>
            ))}
        </div>
        <span className="text-sm">{theme}</span>
    </div>
}

const TimetableThemeList = () => {
    const { timetableTheme, setTimetableTheme } = useSettings();
    return <div className="flex flex-row flex-wrap gap-2">
        {
            Object.keys(timetableColors).map((theme, index) => (
                <TimetableThemePreview key={index} theme={theme} onClick={() => setTimetableTheme(theme)} selected={timetableTheme == theme} />
            ))
        }
    </div>
}

const HeadlessLoginDialog = ({ onClose }: { onClose: () => void}) => {
    const [studentid, setStudentid] = useState('');
    const [password, setPassword] = useState('');
    const { setAISCredentials } = useSettings();
     
    const onSubmit = () => {
        setAISCredentials(studentid, password);
        onClose();
    }

    const onCancel = () => {
        setAISCredentials(undefined, undefined);
        onClose();
    }

    return <ModalDialog>
        <DialogTitle>
            連接校務資訊系統
        </DialogTitle>
        <ModalClose/>
        <DialogContent>
            <p>
                學號密碼僅會用於登入校務資訊系統，並只會儲存在本地端，傳輸過程會使用HTTPS加密連線。
            </p>
            <div className="flex flex-col gap-2">
                <Input placeholder="學號" name="studentid" value={studentid} onChange={(e) => setStudentid(e.target.value)}/>
                <Input placeholder="密碼" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
            </div>
        </DialogContent>
        <DialogActions>
            <Button variant="outlined" color="success" onClick={onSubmit}>連接</Button>
            <Button variant="outlined" color="danger" onClick={onCancel}>取消</Button>
        </DialogActions>
    </ModalDialog>
}

const SettingsPage = () => {

    const { darkMode, setDarkMode, language, setLanguage, ais } = useSettings();
    const [dummy, setDummy] = useState(0);

    
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
                <TimetableThemeList/>
            </div>
            <Divider/>
            <div className="flex flex-row gap-4 py-4" id="headless_ais">
                <div className="flex flex-col flex-1">
                    <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">連接校務資訊系統</h2>
                    <p className="text-gray-600 dark:text-gray-400">系統會用代理登入方式，讓學生們可以在NTHUMods 上輕鬆鏈接校務系統功能。</p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-2">
                    <Button variant="outlined" color="primary" onClick={handleOpenHeadlessLogin}>連接</Button>
                    {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">已連接</span>}
                    {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">登入失敗</span>}
                </div>
            </div>
        </div>
    )
};

export default SettingsPage;