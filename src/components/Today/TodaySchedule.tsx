'use client';

import {Alert, ColorPaletteProp, Divider, Tooltip} from '@mui/joy';
import {format, formatRelative, getDay} from 'date-fns';
import useUserTimetable from '@/hooks/useUserTimetable';
import {scheduleTimeSlots} from '@/const/timetable';
import { enUS, zhTW } from 'date-fns/esm/locale';
import { FC } from "react";
import { useSettings } from '@/hooks/contexts/settings';

const WeatherIcon: FC<{ date: Date, weather: [
    {
        description: "天氣現象",
        elementName: "Wx" ,
        time:{
            elementValue: {value: string, measures: string}[],
            startTime: string,
            endTime: string
        }[]
    },
    {
        description:  "天氣預報綜合描述",
        elementName: "WeatherDescription",
        time:{
            elementValue: {value: string, measures: string}[],
            startTime: string,
            endTime: string
        }[]
    }
]}> = ({ date, weather }) => {
    if(!weather) return <></>;

    const weatherData = weather[0].time.find(t => new Date(t.startTime) <= date && new Date(t.endTime) >= date);
    const weatherDescription = weather[1].time.find(t => new Date(t.startTime) <= date && new Date(t.endTime) >= date);

    if(!weatherData || !weatherDescription) return <></>;

    return (
        <Tooltip title={weatherDescription?.elementValue?.[0].value} placement="bottom" sx={{maxWidth: '180px'}}>
            <img 
                className="w-12 h-12"
                src={`https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/${weatherData!.elementValue?.[1].value}.svg`} 
            />
        </Tooltip>    
    )

}

const TodaySchedule: FC<{ weather: any }> = ({ weather }) => {
    const { timetableData, allCourseData, deleteCourse } = useUserTimetable();
    const { language } = useSettings();

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

    const customLocale = language == 'en' ? {
        ...enUS,
        formatRelative: (token: string) => enLocale[token],
    }: {
        ...zhTW,
        formatRelative: (token: string) => zhLocale[token],
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

    const renderDayTimetable = (day: Date) => { 
        const classesThisDay = timetableData.filter(t => t.dayOfWeek == [6,0,1,2,3,4,5][getDay(day)]);

        if(classesThisDay.length == 0) return (
            <div className="flex flex-col items-center">
                <span className="text-sm font-semibold">No Classes Today</span>
                <span className="text-xs">Enjoy your day off!</span>
            </div>
        )

        return classesThisDay.sort((a, b) => a.startTime - b.startTime).map((t, index) => (
            <div className="flex flex-row" key={index}>
                <div className="flex flex-col justify-between text-sm pr-1 py-[2px] text-gray-400 w-11">
                    <p>{scheduleTimeSlots[t.startTime].start}</p>
                    <p>{scheduleTimeSlots[t.endTime].end}</p>
                </div>
                <div className="flex flex-col rounded-md p-2 flex-1 text-black/70" style={{background: t.color}}>
                    <p className="font-semibold">{t.course.name_zh}</p>
                    <p className="text-xs">{t.course.name_en}</p>
                    <Divider/>
                    <p className="text-xs">{t.course.venue}</p>
                </div>
            </div>
        ))
    }

    const renderAlerts = (day: Date) => {
        const alerts: {
            title: string,
            description: string,
            alert: ColorPaletteProp,
            startDate: string,
            endDate: string
        }[] = [
            { title: 'Typhoon Koinu: Class Suspended', description: 'Typhoon Koinu is approaching, classes are suspended for the day.', alert: 'danger', startDate: '2023-10-05 00:00:00', endDate: '2023-10-05 23:59:59' },
        ]

        return alerts.filter(alert => new Date(alert.startDate) <= day && new Date(alert.endDate) >= day).map((alert, index) => (
            <Alert key={index} className="mb-4" color={alert.alert}>
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
                        <div className="text-sm font-semibold text-gray-400">{format(day, 'EEEE, do MMMM', { locale: zhTW })}</div>
                        {/* WEDNESDAY */}
                        <div className="text-xl font-semibold text-gray-600">{formatRelative(day, Date.now(), { locale: customLocale })}</div>
                    </div>
                    <WeatherIcon date={day} weather={weather?.records?.locations[0]?.location[0]?.weatherElement}/>
                </div>
                {renderAlerts(day)}
                {renderDayTimetable(day)}
            </div>
        ))}
    </div>
}

export default TodaySchedule;