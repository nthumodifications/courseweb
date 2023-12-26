'use client'

import { HelpCircle, MessageCircle } from "lucide-react"
import { useSettings } from "@/hooks/contexts/settings"
import { currentSemester} from "@/const/semester"
import { Button } from "@/components/ui/button"
import FullLogo from "./Branding/FullLogo"
import Help from "@/components/Help/Help"
import Link from "next/link"

const Header = () => {
  const { language } = useSettings();
  const currentWeek = currentSemester? Math.floor((new Date().getTime() - currentSemester.begins.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 : null;

  return (
    <header className="h-14 w-screen bg-white dark:bg-neutral-900 shadow-md px-4 md:px-8 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4">
      <div className="flex flex-col md:flex-row mr-auto md:items-center gap-1 mt-1 md:mt-0 md:gap-4">
        <Link href={"/"+language+"/timetable"}>
          <FullLogo />
        </Link>
        <p className="text-xs text-gray-600 dark:text-gray-400">
        {language == 'en' &&
          (currentSemester ?`AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`: `Holiday`)}
        {language == 'zh' &&
          (currentSemester ?`${currentSemester.year-1911}-${currentSemester.semester} 學期, 第${currentWeek}週`: `假期`)}
        </p>
      </div>
      <div className="flex gap-2">
        <Help/>
        <Button size="sm" variant="outline" asChild>
          <Link className="flex gap-1" target="_blank" href="https://forms.gle/LKYiVhLVwRGL44pz6">
            <MessageCircle size="16" />
            Feedback
          </Link>
        </Button>
      </div>
    </header>
  )
}

export default Header;