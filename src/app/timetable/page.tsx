'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";

const TimetablePage: NextPage = () => {
    // const { language } = useSettings();
    return (
        <div className="grid grid-cols-[3fr_2fr] p-4">
            <Timetable timetableData={[]} />
        </div>
    )
}

export default TimetablePage;