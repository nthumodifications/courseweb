'use client';;
import { FC } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import FullLogo from "./Branding/FullLogo";
import Link from "next/link";
import { currentSemester} from '@/const/semester';
const Header: FC = () => {

    const { language } = useSettings();

    const currentWeek = currentSemester? Math.floor((new Date().getTime() - currentSemester.begins.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 : null;


    return (
        <header className="h-14 w-screen bg-gray-100 dark:bg-neutral-800 shadow-md px-4 md:px-8 py-4 md:col-span-2 flex flex-row justify-between items-center z-50">
            <Link href={"/"+language+"/timetable"}>
                <FullLogo />
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
            {language == 'en' &&
                (currentSemester ?`AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`: `Holiday`)}
            {language == 'zh' &&
                (currentSemester ?`${currentSemester.year-1911}-${currentSemester.semester} 學期, 第${currentWeek}周`: `假期`)}
            </p>
            
        </header>
    )
}

export default Header;