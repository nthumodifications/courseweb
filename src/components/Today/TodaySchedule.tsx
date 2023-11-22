'use client';

import {Alert, ColorPaletteProp, Divider, Tooltip} from '@mui/joy';
import {format, formatRelative, getDay} from 'date-fns';
import useUserTimetable from '@/hooks/useUserTimetable';
import {scheduleTimeSlots} from '@/const/timetable';
import { FC } from "react";
import { useSettings } from '@/hooks/contexts/settings';
import { AlertDefinition } from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import WeatherIcon from './WeatherIcon';
import { getLocale } from '@/helpers/dateLocale';
import { Info } from 'react-feather';
import {WeatherData} from '@/types/weather';

const TodaySchedule: FC<{ weather: WeatherData, alerts: AlertDefinition[] }> = ({ weather, alerts }) => {
    console.log(weather);
    const { timetableData, allCourseData, deleteCourse } = useUserTimetable();
    const { language } = useSettings();
    const dict = useDictionary();

    const getRangeOfDays = (start: Date, end: Date) => {
        const days = [];
        for(let i = start.getTime(); i <= end.getTime(); i += 86400000) {
            days.push(new Date(i));
        }
        return days;
    }
    //get a range of 5 days starting from today
    const days = getRangeOfDays(new Date(), new Date(Date.now() + 86400000 * 4));

    const renderDayTimetable = (day: Date) => { 
        const classesThisDay = timetableData.filter(t => t.dayOfWeek == [6,0,1,2,3,4,5][getDay(day)]);

        if(classesThisDay.length == 0) return (
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
                <div className="flex flex-col rounded-md p-2 flex-1" style={{background: t.color, color: t.textColor}}>
                    <p className="font-semibold">{t.course.name_zh}</p>
                    <p className="text-xs">{t.course.name_en}</p>
                    <Divider/>
                    <p className="text-xs">{t.venue}</p>
                </div>
            </div>
        ))
    }

    const renderAlerts = (day: Date) => {
        return alerts.filter(alert => new Date(alert.start_date) <= day && new Date(alert.end_date) >= day).map((alert, index) => (
            <Alert key={index} className="mb-4" color={alert.severity as ColorPaletteProp} startDecorator={<Info/>}>
                <div className="flex flex-row justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{alert.title}</span>
                        <span className="text-xs">{alert.description}</span>
                    </div>
                </div>
            </Alert>
        ))
    }


    return <div className="h-full w-full px-3 md:px-8 py-4">
        {days.map(day => (
            <div className="flex flex-col gap-2 pb-8" key={day.getTime()}>
                <div className="flex flex-row gap-2 justify-between border-b border-gray-400 pb-2">
                    <div className="flex flex-col flex-1">
                        {/* 6TH OCTOBER */}
                        <div className="text-sm font-semibold text-gray-400 dark:text-gray-500">{format(day, 'EEEE, do MMMM', { locale: getLocale(language) })}</div>
                        {/* WEDNESDAY */}
                        <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">{formatRelative(day, Date.now(), { locale: getLocale(language) })}</div>
                    </div>
                    <WeatherIcon date={day} weather={weather.find(w => w.date == format(day, 'yyyy-MM-dd'))!}/>
                </div>
                {renderAlerts(day)}
                {renderDayTimetable(day)}
            </div>
        ))}
    </div>
}

export default TodaySchedule;