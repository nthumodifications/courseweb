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
    const dict = useDictionary();
    return <Card>
        <CardHeader>
            <CardTitle>{dict.settings.display.title}</CardTitle>
            <CardDescription>{dict.settings.display.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4 items-center" id="darkmode">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">{dict.settings.display.dark_mode.title}</h2>
                </div>
                <div className="flex items-center">
                    <Switch checked={darkMode} defaultChecked={darkMode} onCheckedChange={(e) => setDarkMode(e)} />
                </div>
            </div>
            <Separator orientation="horizontal" />
            <div className="flex flex-row gap-4 py-4 items-center" id="language">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">{dict.settings.display.language.title}</h2>
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
    const dict = useDictionary();
    return <Card>
        <CardHeader>
            <CardTitle>{dict.settings.timetable.title}</CardTitle>
            <CardDescription>{dict.settings.timetable.description}</CardDescription>
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
            <CardTitle>{dict.settings.account.title}</CardTitle>
            <CardDescription>{dict.settings.account.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4" id="account">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">{dict.settings.account.ccxp.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{dict.settings.account.ccxp.description}</p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-2 w-max">
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
    const dict = useDictionary();

    return <Card>
        <CardHeader>
            <CardTitle>{dict.settings.privacy.title}</CardTitle>
            <CardDescription>{dict.settings.privacy.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row gap-4 py-4" id="privacy">
                <div className="flex flex-col flex-1 gap-1">
                    <h2 className="font-semibold text-base">{dict.settings.privacy.analytics.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{dict.settings.privacy.analytics.description}</p>
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