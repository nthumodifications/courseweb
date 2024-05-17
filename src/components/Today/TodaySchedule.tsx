'use client';;
import { EventData } from "@/types/calendar_event";
import { format, formatRelative, getDay } from 'date-fns';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { scheduleTimeSlots } from '@/const/timetable';
import { FC, useMemo } from 'react';
import { useSettings } from '@/hooks/contexts/settings';
import { AlertDefinition } from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import WeatherIcon from './WeatherIcon';
import { getLocale } from '@/helpers/dateLocale';
import { Info, CalendarRange } from 'lucide-react';
import { WeatherData } from '@/types/weather';
import { apps } from '@/const/apps';
import Link from 'next/link';
import { getSemester, lastSemester } from '@/const/semester';
import { createTimetableFromCourses } from '@/helpers/timetable';
import { MinimalCourse } from '@/types/courses';
import { VenueChip } from '../Timetable/VenueChip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import useTime from "@/hooks/useTime";
import { NoClassPickedReminder } from "./NoClassPickedReminder";

const getRangeOfDays = (start: Date, end: Date) => {
    const days = [];
    for (let i = start.getTime(); i <= end.getTime(); i += 86400000) {
        days.push(new Date(i));
    }
    return days;
}

const TodaySchedule: FC<{ weather: WeatherData | undefined, alerts: AlertDefinition[], calendar: EventData[], weatherLoading: boolean, alertLoading: boolean, calendarLoading: boolean }> = ({ weather, alerts, calendar, weatherLoading, alertLoading, calendarLoading }) => {
    const { isCoursesEmpty, colorMap, getSemesterCourses } = useUserTimetable();
    const { language, pinnedApps } = useSettings();
    const dict = useDictionary();
    const date = useTime();

    const curr_sem = useMemo(() => getSemester(date), [date]);
    const timetableData = useMemo(() => createTimetableFromCourses(getSemesterCourses(curr_sem?.id) as MinimalCourse[], colorMap), [getSemesterCourses, curr_sem]);
    //sort display_courses according to courses[semester]
    const displayCourseData = useMemo(() => getSemesterCourses(lastSemester.id), [getSemesterCourses, lastSemester]);

    const nextTimetableData = useMemo(() => createTimetableFromCourses(displayCourseData as MinimalCourse[], colorMap), [displayCourseData, colorMap]);

    //get a range of 5 days starting from today
    const days = useMemo(() => getRangeOfDays(date, new Date(date.getTime() + 86400000 * 4)),[date]);

    const renderDayTimetable = (day: Date) => {
        if (!curr_sem) return <div className='text-gray-500 dark:text-gray-400 text-center text-sm font-semibold'>放假咯！</div>;
        const classesThisDay = (curr_sem == lastSemester ? nextTimetableData : timetableData).filter(t => t.dayOfWeek == [6, 0, 1, 2, 3, 4, 5][getDay(day)]);

        if (classesThisDay.length == 0) return (
            <div className="flex flex-col items-center text-gray-800 dark:text-gray-500">
                <span className="text-sm font-semibold">{dict.today.noclass}</span>
                <span className="text-xs">{dict.today.noclass_sub}</span>
            </div>
        )

        return classesThisDay.sort((a, b) => a.startTime - b.startTime).map((t, index) => (
            <div className="flex flex-row" key={index}>
                <div className="flex flex-col justify-between text-sm pr-1 py-[2px] text-gray-400 w-11">
                    <p>{scheduleTimeSlots[t.startTime].start}</p>
                    <p>{scheduleTimeSlots[t.endTime].end}</p>
                </div>
                <div className="flex flex-col rounded-md p-2 flex-1" style={{ background: t.color, color: t.textColor }}>
                    <p className="font-semibold">{t.course.name_zh}</p>
                    <p className="text-xs">{t.course.name_en}</p>
                    <div className='w-fit mt-1'><VenueChip venue={t.venue} color={t.textColor} textColor={t.color} /></div>
                </div>
            </div>
        ))
    }

    const applist = apps.filter(app => pinnedApps.includes(app.id));
    const renderPinnedApps = () => {
        if (applist.length == 0) return <></>;
        return <div className='flex flex-col gap-1'>
            <h1 className='text-xs font-bold text-gray-500'>{dict.applist.title}</h1>
            <div className='flex flex-row flex-wrap gap-2 pb-2'>
                {applist.map((app, index) => (
                    <Link href={app.href} key={index}>
                        <div className='flex flex-col items-center justify-center p-2 gap-2 w-16'>
                            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 grid place-items-center">
                                <app.Icon size={20} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <h2 className="text-xs font-medium text-gray-600 text-center line-clamp-2 break-all">{language == 'zh' ? app.title_zh : app.title_en}</h2>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    }

    const renderAlerts = (day: Date) => {
        return alerts.filter(alert => new Date(alert.start_date) <= day && new Date(alert.end_date) >= day).map((alert, index) => (
            <Alert key={index} className="mb-4" color={alert.severity}>
                <Info className='w-4 h-4' />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
            </Alert>
        ))
    }

    const renderCalendars = (day: Date) => {
        return !calendarLoading && calendar && calendar.filter((event) => event.weekday == day.getDay()).map((event) =>
            <Alert key={event.weekday}>
                <CalendarRange className="h-4 w-4" />
                <AlertDescription>
                    {event.summary}
                </AlertDescription>
            </Alert>
        )
    }

    

    return <div className="h-full w-full px-3 md:px-8 space-y-4">
        {isCoursesEmpty && <NoClassPickedReminder />}
        {renderPinnedApps()}
        {days.map(day => (
            <div className="flex flex-col gap-2 pb-4" key={format(day, 'EEEE, do MMMM')}>
                <div className="flex flex-row gap-2 justify-between border-b border-gray-400 pb-2">
                    <div className="flex flex-col flex-1">
                        {/* 6TH OCTOBER */}
                        <div className="text-sm font-semibold text-gray-400 dark:text-gray-500">{format(day, 'EEEE, do MMMM', { locale: getLocale(language) })}</div>
                        {/* WEDNESDAY */}
                        <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">{formatRelative(day, Date.now(), { locale: getLocale(language) })}</div>
                    </div>
                    {!weatherLoading && weather && <WeatherIcon date={day} weather={weather!.find(w => w.date == format(day, 'yyyy-MM-dd'))!} />}
                </div>
                {renderAlerts(day)}
                {renderCalendars(day)}
                {renderDayTimetable(day)}
            </div>
        ))}
    </div>
}

export default TodaySchedule;
