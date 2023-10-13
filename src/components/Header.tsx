'use client';
import { FC, useMemo } from "react";
import { formatDistance, parse } from 'date-fns';
import { useSettings } from "@/hooks/contexts/settings";
const Header: FC = () => {

    const { language } = useSettings();

    const semesterInfo = [
        { year: 2023, semester: 1, begins: new Date(2023,9 -1,11), ends: new Date(2024, 1-1, 12) },
        { year: 2023, semester: 2, begins: new Date(2024,2 -1, 19), ends: new Date(2024, 6-1, 21) }
    ]

    const currentSemester = semesterInfo.find(semester => {
        const now = new Date();
        return now >= semester.begins && now <= semester.ends;
    });

    const currentWeek = currentSemester? Math.floor((new Date().getTime() - currentSemester.begins.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 : null;


    return (
        <header className="h-14 w-screen bg-gray-100 px-8 py-4 md:col-span-2 flex flex-row justify-between">
            <h1 className="font-bold text-lg">NTHUMods</h1>
            <p className="text-sm text-gray-600">
            {language == 'en' &&
                (currentSemester ?`AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`: `No Active Semester`)}
            {language == 'tw' &&
                (currentSemester ?`${currentSemester.year-1911}-${currentSemester.semester} 學期, 第${currentWeek}周`: `No Active Semester`)}
            </p>
        </header>
    )
}

export default Header;