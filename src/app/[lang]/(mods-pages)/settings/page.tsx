'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { useEffect, useState } from "react";
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
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const DisplaySettingsCard = () => {
    const { darkMode, setDarkMode, language, setLanguage } = useSettings();
    return <Card>
        <CardHeader>
            <CardTitle>Display</CardTitle>
            <CardDescription>Appearance, Language</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4 items-center" id="darkmode">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">Dark Mode</h2>
                </div>
                <div className="flex items-center">
                    <Switch checked={darkMode} defaultChecked={darkMode} onCheckedChange={(e) => setDarkMode(e)} />
                </div>
            </div>
            <Separator orientation="horizontal" />
            <div className="flex flex-row gap-4 py-4 items-center" id="language">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">Language</h2>
                </div>
                <div className="flex items-center">
                    <Select defaultValue={language} value={language} onValueChange={(v) => setLanguage(v as Language)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="zh">繁體中文</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
    </Card>
}

const TimetableSettingsCard = () => {
    return <Card>
        <CardHeader>
            <CardTitle>Timetable</CardTitle>
            <CardDescription>Theme, Preview</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4 py-4" id="theme">
                <TimetablePreview />
                <TimetableThemeList />
            </div>
        </CardContent>
    </Card>
}

const AccountInfoSettingsCard = () => {
    const { ais } = useHeadlessAIS();
    const dict = useDictionary();
    return <Card>
        <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manual, NTHU AIS Login</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4" id="account">
                <div className="flex flex-col flex-1 gap-1 max-w-[70%]">
                    <h2 className="font-semibold text-base">{dict.settings.ccxp.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{dict.settings.ccxp.description}</p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-2">
                    <LoginDialog />
                    {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">{dict.ccxp.connected}</span>}
                    {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">{dict.ccxp.failed}</span>}
                </div>
            </div>
        </CardContent>
    </Card>
}

const PrivacySettingsCard = () => {
    const { analytics, setAnalytics } = useSettings();

    return <Card>
        <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Analytics</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4" id="privacy">
                <div className="flex flex-col flex-1 gap-1 max-w-[70%]">
                    <h2 className="font-semibold text-base">Analytics</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Send anonymous usage info to Google Analytics</p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-2">
                    <Switch checked={analytics} defaultChecked={analytics} onCheckedChange={(e) => setAnalytics(e)} />
                </div>
            </div>
        </CardContent>
    </Card>
}

const SettingsPage = () => {
    return (
        <div className="flex flex-col max-w-2xl px-4 gap-4">
            <AccountInfoSettingsCard />
            <DisplaySettingsCard />
            <TimetableSettingsCard />
            <PrivacySettingsCard />
            <Footer />
        </div>
    )
};

export default SettingsPage;