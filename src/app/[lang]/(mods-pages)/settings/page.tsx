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
        <div className="flex justify-center text-center w-full">
            目前非轉系所申請時間 <br/>
            The system is not available now.
        </div>
    )
};

export default SettingsPage;