'use client';;
import { FC } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import FullLogo from "./Branding/FullLogo";
import Link from "next/link";
import { currentSemester} from '@/const/semester';
import Button from '@mui/joy/Button';
import { HelpCircle, MessageCircle } from 'lucide-react'
import Help from '@/components/Help/Help'

const Header: FC = () => {

    const { language } = useSettings();

    const currentWeek = currentSemester? Math.floor((new Date().getTime() - currentSemester.begins.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 : null;


    return (
        <header className="h-14 w-screen bg-white dark:bg-neutral-900 shadow-md px-4 md:px-8 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4">
            <Link href={"/"+language+"/timetable"} className="mr-auto">
                <FullLogo />
            </Link>

            <p className="text-sm text-gray-600 dark:text-gray-400">
            {language == 'en' &&
                (currentSemester ?`AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`: `Holiday`)}
            {language == 'zh' &&
                (currentSemester ?`${currentSemester.year-1911}-${currentSemester.semester} 學期, 第${currentWeek}周`: `假期`)}
            </p>
            
            <div className="flex gap-2">
                <Help/>
                <Button component="a" target="_blank" href="https://forms.gle/LKYiVhLVwRGL44pz6" size="sm" startDecorator={<MessageCircle size={16} />} variant="outlined" color="neutral">
                    Feedback
                </Button>
            </div>

        </header>
    )
}

export default Header;