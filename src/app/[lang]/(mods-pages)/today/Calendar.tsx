import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addWeeks, differenceInDays, differenceInWeeks, eachDayOfInterval, eachHourOfInterval, endOfWeek, format, isSameDay, isSameMonth, isToday, set, startOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { CourseTimeslotData } from '@/types/timetable';
import { semesterInfo } from '@/const/semester';
import { parseSlotTime, scheduleTimeSlots } from '@/const/timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { createContext, useContext, useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { Separator } from '@/components/ui/separator';
import { CalendarEvent } from './calendar.types';
import { CalendarProvider, useCalendar } from './calendar_hook';
import { WeekSelector } from './WeekSelector';
import { AddEventButton } from './AddEventButton';
import { CurrentTimePointer } from './CurrentTimePointer';


const getWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({
        start: start,
        end: end
    });
}

const CalendarContent = () => {
    const { timetableData } = useUserTimetable();
    const [displayWeek, setDisplayWeek] = useState<Date[]>(getWeek(new Date()));
    const { events, setEvents, weekContainer, HOUR_HEIGHT } = useCalendar();

    const hours = eachHourOfInterval({
        start: new Date(2024, 2, 3, 0),
        end: new Date(2024, 2, 3, 23)
    });

    //week movers
    const moveBackward = () => {
        setDisplayWeek(displayWeek.map(d => subWeeks(d, 1)))
    }

    const moveForward = () => {
        setDisplayWeek(displayWeek.map(d => addWeeks(d, 1)))
    }

    const backToToday = () => {
        setDisplayWeek(getWeek(new Date()));
    }

    const timetableToCalendarEvent = (timetable: CourseTimeslotData[]): CalendarEvent[] => {
        return timetable.map(t => {
            const semester = semesterInfo.find(s => s.id == t.course.semester)!;
            const startTime = parseSlotTime(scheduleTimeSlots[t.startTime].start);
            const endTime = parseSlotTime(scheduleTimeSlots[t.endTime].end);
            const startDate = set(addDays(semester.begins, t.dayOfWeek), { hours: startTime[0], minutes: startTime[1] });
            const endDate = set(addDays(semester.begins, t.dayOfWeek), { hours: endTime[0], minutes: endTime[1] });

            return {
                title: t.course.name_zh,
                allDay: false,
                start: startDate,
                end: endDate,
                repeat: {
                    type: 'weekly',
                    interval: 1,
                    date: semester.ends
                },
                color: t.color,
                tag: 'course'
            }
        })
    }

    useEffect(() => {
        setEvents([
            {
                title: 'NTHUMods Meeting',
                allDay: false,
                start: new Date(2024, 2, 13, 9, 0),
                end: new Date(2024, 2, 13, 10, 30),
                repeat: null,
                color: '#F3ECFB',
                tag: 'meeting'
            },
            ...timetableToCalendarEvent(timetableData)
        ])
    }, [timetableData])

    const handleAddEvent = (data: CalendarEvent) => {
        setEvents([...events, data]);
    }

    const renderEventsInDay = (day: Date) => {
        const dayEvents = events.filter(e => {
            //check if event is in the day
            if(e.allDay) return false; //skip all day events as handled in another way
            if (isSameDay(e.start, day)) return true;
            //check if event is a repeating event
            if (e.repeat) {
                //check if day is past the start date
                if (day < e.start) return false;
                if (e.repeat.type == 'weekly') {
                    //check if is the same day of the week
                    if (e.start.getDay() != day.getDay()) return false;

                    //get difference in weeks between the start of the event and the day
                    const weeks = differenceInWeeks(day, e.start);
                    //check if the difference is a multiple of the interval
                    if (weeks % (e.repeat.interval ?? 1) == 0) {
                        //check if the day is before the end date
                        if ('date' in e.repeat && e.repeat.date >= day) return true;
                        if ('count' in e.repeat && weeks / (e.repeat.interval ?? 1) <= e.repeat.count) return true;
                    }
                }
                if (e.repeat.type == 'daily') {
                    //check if is multiple of interval
                    const days = differenceInDays(day, e.start);
                    if (days % (e.repeat.interval ?? 1) == 0) {
                        if ('date' in e.repeat && e.repeat.date >= day) return true;
                        if ('count' in e.repeat && days / (e.repeat.interval ?? 1) <= e.repeat.count) return true;
                    }
                }
            }
            return false;
        });
        return dayEvents.map((event, index) => (
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        key={index}
                        className="absolute left-0 w-full pr-1 "
                        style={{
                            top: (event.start.getHours() * HOUR_HEIGHT) + (event.start.getMinutes() * HOUR_HEIGHT / 60),
                            height: (event.end.getHours() - event.start.getHours()) * HOUR_HEIGHT + (event.end.getMinutes() - event.start.getMinutes()) * HOUR_HEIGHT / 60,
                        }}>
                        <div className="bg-nthu-500 text-black rounded-md h-full p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none" style={{ background: event.color }}>
                            <div className="text-sm leading-none">{event.title}</div>
                            <div className="text-xs font-normal leading-none">{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent>
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-row gap-1'>
                            <div className='w-6 py-1'>
                                <div className='w-4 h-4 rounded-full' style={{ background: event.color }}></div>
                            </div>
                            <div className='flex flex-col gap-1 flex-1'>
                                <h1 className='text-xl font-semibold'>{event.title}</h1>
                                {isSameDay(event.start, event.end) ?
                                    <p className='text-sm text-slate-700'>{format(event.start, 'yyyy-M-d')} ⋅ {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</p>:
                                    <p className='text-sm text-slate-700'>{format(event.start, 'yyyy-M-d HH:mm')} - {format(event.end, 'yyyy-LL-dd HH:mm')}</p>
                                }
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        ))
    }

    const renderAllDayEvents = () => {
        //check if any all day events in the week
        const weekEvents = events.filter(e => e.allDay).filter((event, index) => {
            //check if event is in the week
            if (event.start >= displayWeek[0] && event.start <= displayWeek[6] && event.end >= displayWeek[0] && event.end <= displayWeek[6]) return true;
            else if (event.repeat) {
                //check if day is past the start date
                if (displayWeek[0] <= event.start) return false;
                if (event.repeat.type == 'weekly') {
                    //check if is the same day of the week
                    if (event.start.getDay() != displayWeek[0].getDay()) return false;

                    //get difference in weeks between the start of the event and the day
                    const weeks = differenceInWeeks(displayWeek[0], event.start);
                    //check if the difference is a multiple of the interval
                    if (weeks % (event.repeat.interval ?? 1) == 0) {
                        //check if the day is before the end date
                        if ('date' in event.repeat && event.repeat.date >= displayWeek[0]) return true;
                        if ('count' in event.repeat && weeks / (event.repeat.interval ?? 1) <= event.repeat.count) return true;
                    }
                }
                if (event.repeat.type == 'daily') {
                    //check if is multiple of interval
                    const days = differenceInDays(displayWeek[0], event.start);
                    if (days % (event.repeat.interval ?? 1) == 0) {
                        if ('date' in event.repeat && event.repeat.date >= displayWeek[0]) return true;
                        if ('count' in event.repeat && days / (event.repeat.interval ?? 1) <= event.repeat.count) return true;
                    }
                }

            }
            return false;
        })

        console.log(weekEvents)

        return <></>
    }


    return (
            <div className="flex flex-col gap-6 flex-1">
                <div className="flex flex-col md:flex-row gap-2 justify-evenly">
                    <div className="flex-1 w-full">
                        <WeekSelector date={displayWeek[0]} setDate={d => setDisplayWeek(getWeek(d))} />
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Display" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Week</SelectItem>
                                <SelectItem value="month">Month</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={backToToday}>Today</Button>
                        <Button variant="outline" onClick={moveBackward}><ChevronLeft /></Button>
                        <Button variant="outline" onClick={moveForward}><ChevronRight /></Button>
                        <AddEventButton onEventAdded={handleAddEvent} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <div className="flex flex-col min-w-[580px] md:min-w-0">
                        <div className="flex flex-row justify-evenly h-16">
                            <div className="w-12"></div>
                            {displayWeek.map((day, index) => (
                                <div key={day.getTime()} className="flex flex-col flex-1 items-center justify-center h-full select-none">
                                    <div className="text-slate-900 text-lg font-semibold">{format(day, 'E')}</div>
                                    <div className={cn("text-slate-500 text-sm text-center align-baseline", isToday(day) ? "w-6 h-6 rounded-full bg-nthu-500 text-white" : "")}>{format(day, isSameMonth(day, new Date()) ? 'd' : 'MMM d')}</div>
                                </div>)
                            )}
                        </div>
                        <div className="flex flex-row justify-evenly">
                            <div className="w-12"></div>
                            <div className='grid grid-col-7'>
                                {renderAllDayEvents()}
                            </div>
                        </div>
                        <Separator orientation="horizontal" />
                        <div className="h-[70vh] w-full flex flex-row overflow-y-auto scrollbar-none" ref={weekContainer}>
                            <div className="flex flex-row w-full h-max">
                                <div className="flex flex-col w-12" style={{ paddingTop: 20 / 2 }}>
                                    {[...hours].splice(1).map((hour, index) => (
                                        <div key={hour.getTime()} style={{ paddingTop: HOUR_HEIGHT - 20 }}>
                                            <div className="text-slate-500 text-sm select-none">{format(hour, 'HH:mm')}</div>
                                        </div>
                                    ))}
                                </div>
                                <Separator orientation="vertical" />
                                <div className="flex-1 relative h-full">
                                    <div className="flex flex-row">
                                        {displayWeek.map((day, index) => (
                                            <div key={day.getTime()} className="relative flex-1">
                                                <div className="flex flex-col border-r border-slate-200 flex-1">
                                                    {hours.map((hour, index) => (
                                                        <div key={hour.getTime()} className="border-b border-slate-200" style={{ height: HOUR_HEIGHT }}></div>
                                                    ))}
                                                </div>
                                                {renderEventsInDay(day)}
                                            </div>
                                        ))}
                                    </div>
                                    <CurrentTimePointer />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    )
}

const Calendar = () => {
    return  <CalendarContent/>
    
}

export default Calendar;