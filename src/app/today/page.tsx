'use client';
import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";
import {Input} from '@mui/joy';
import { format, formatRelative, getDay } from "date-fns";
import useUserTimetable from '@/hooks/useUserTimetable';
import {scheduleTimeSlots} from '@/const/timetable';
import { enUS, zhTW } from 'date-fns/esm/locale';

const TodayPage: NextPage = () => {
    const { timetableData, allCourseData, deleteCourse } = useUserTimetable();

    // WARN: Day is formatted by MTWRFSS (0-7)

    const enLocale: { [x: string]: string } = {
        lastWeek: "'last' eeee 'at' p",
        yesterday: "'Yesterday'",
        today: "'Today'",
        tomorrow: "'Tomorrow'",
        nextWeek: "EEEE",
        other: 'P'
    };

    
    const zhLocale: { [x: string]: string } = {
        lastWeek: "'last' eeee 'at' p",
        yesterday: "'昨天'",
        today: "'今天'",
        tomorrow: "'明天'",
        nextWeek: "EEEE",
        other: 'P'
    };

    const customLocale = {
        ...enUS,
        formatRelative: (token: string) => enLocale[token],
    }
      

    const getRangeOfDays = (start: Date, end: Date) => {
        const days = [];
        for(let i = start.getTime(); i <= end.getTime(); i += 86400000) {
            days.push(new Date(i));
        }
        return days;
    }
    //get a range of 5 days starting from today
    const days = getRangeOfDays(new Date(), new Date(Date.now() + 86400000 * 4));

    return (
        <div className="h-full grid grid-cols-[380px_auto] grid-rows-1">
            <div className="h-full w-full px-8 py-4">
                {days.map(day => (
                    <div className="flex flex-col gap-2 pb-8">
                        <div className="flex flex-row gap-2 justify-between border-b border-gray-400 pb-2">
                            <div className="flex flex-col flex-1">
                                {/* 6TH OCTOBER */}
                                <div className="text-sm font-semibold text-gray-400">{format(day, 'EEEE, do MMMM')}</div>
                                {/* WEDNESDAY */}
                                <div className="text-xl font-semibold text-gray-600">{formatRelative(day, Date.now(), { locale: customLocale })}</div>
                            </div>
                        </div>
                        {timetableData.filter(t => t.dayOfWeek == [6,0,1,2,3,4,5][getDay(day)]).map((t, index) => (
                            <div className="flex flex-row">
                                <div className="flex flex-col justify-between text-sm pr-1 py-[2px] text-gray-400 w-11">
                                    <p>{scheduleTimeSlots[t.startTime].start}</p>
                                    <p>{scheduleTimeSlots[t.endTime].end}</p>
                                </div>
                                <div className="flex flex-col rounded-md p-2 flex-1 text-black/70" style={{background: t.color}}>
                                    <p className="font-semibold">{t.course.name_zh}</p>
                                    <p className="text-sm">{t.course.name_en}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <main className='overflow-auto'>
                {/* {children} */}
            </main>
        </div>
    )
}

export default TodayPage;