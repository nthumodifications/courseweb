import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, addWeeks, differenceInDays, differenceInWeeks, eachDayOfInterval, eachHourOfInterval, endOfWeek, format, isSameDay, isSameMonth, isToday, set, startOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import useTime from '@/hooks/useTime';
import { CourseTimeslotData } from '@/types/timetable';
import { semesterInfo } from '@/const/semester';
import { parseSlotTime, scheduleTimeSlots } from '@/const/timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
interface RepeatDefinition {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
}

interface RepeatByCount extends RepeatDefinition {
    count: number;
}

interface RepeatByDate extends RepeatDefinition {
    date: Date;
}

type Repeat = RepeatByCount | RepeatByDate | RepeatDefinition;

interface CalendarEvent {
    title: string;
    allDay: boolean;
    start: Date;
    end: Date;
    repeat: null | Repeat;
    color: string;
    tag: string;
}
const HOUR_HEIGHT = 48;

const CurrentTimePointer = () => {
    const date = useTime();

    return <div className="absolute -left-2 flex flex-row z-50 w-full items-center" style={{
        top: -8 + (date.getHours() * HOUR_HEIGHT) + (date.getMinutes() * HOUR_HEIGHT / 60),
    }}>
        <span className="-left-10 absolute text-nthu-600 font-semibold shadow-sm">{format(date, 'HH:mm')}</span>
        <div className="w-4 h-4 bg-nthu-600 rounded-full shadow-md"></div>
        <div className="flex-1 h-0 outline outline-1 outline-nthu-600 shadow-md"></div>
    </div>
}

const getWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({
        start: start,
        end: end
    });
}

const WeekSelector = ({ date, setDate }: { date: Date, setDate: (d: Date) => void }) => {
    const [open, setOpen] = useState(false);

    const handleDateSelect = (d: Date | undefined) => {
        setDate(d!);
        setOpen(false);
    }

    return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger>
      <h2 className="text-slate-900 text-2xl font-semibold w-max">March 2024</h2>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <ShadcnCalendar
        mode="single"
        selected={date}
        onSelect={handleDateSelect}
        initialFocus
      />
    </PopoverContent>
  </Popover>

}

const Calendar = () => {
    const { timetableData } = useUserTimetable();
    const [displayWeek, setDisplayWeek] = useState<Date[]>(getWeek(new Date()));
    
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
    
    const events: CalendarEvent[] = [
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
    ]


    const renderEventsInDay = (day: Date) => {
        const dayEvents = events.filter(e => {
            //check if event is in the day
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
                if(e.repeat.type == 'daily') {
                    //check if is multiple of interval
                    const days = differenceInDays(day, e.start);
                    if(days % (e.repeat.interval ?? 1) == 0) {
                        if ('date' in e.repeat && e.repeat.date >= day) return true;
                        if ('count' in e.repeat && days / (e.repeat.interval ?? 1) <= e.repeat.count) return true;
                    }
                }
            }
            return false;
        });
        return dayEvents.map((event, index) => (
            <div
                className="absolute left-0 w-full pr-1 "
                style={{
                    top: (event.start.getHours() * HOUR_HEIGHT) + (event.start.getMinutes() * HOUR_HEIGHT / 60),
                    height: (event.end.getHours() - event.start.getHours()) * HOUR_HEIGHT + (event.end.getMinutes() - event.start.getMinutes()) * HOUR_HEIGHT / 60,
                }}>
                <div className="bg-nthu-500 text-black rounded-md h-full p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow" style={{ background: event.color }}>
                    <div className="text-sm leading-none">{event.title}</div>
                    <div className="text-xs font-normal leading-none">{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
                </div>
            </div>
        ))
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-2 justify-evenly">
                <div className="flex-1 w-full">
                    <WeekSelector date={displayWeek[0]} setDate={d => setDisplayWeek(getWeek(d))}/>
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
                    <Button className="hidden md:inline-flex"><Plus className="mr-2" /> 新增行程</Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="flex flex-col min-w-[580px] md:min-w-0">
                    <div className="flex flex-row justify-evenly h-16">
                        <div className="w-12"></div>
                        {displayWeek.map((day, index) => (
                            <div className="flex flex-col flex-1 items-center justify-center h-full">
                                <div className="text-slate-900 text-lg font-semibold">{format(day, 'E')}</div>
                                <div className={cn("text-slate-500 text-sm text-center align-baseline", isToday(day) ? "w-6 h-6 rounded-full bg-nthu-500 text-white" : "")}>{format(day, isSameMonth(day,  new Date())? 'd': 'MMM d')}</div>
                            </div>)
                        )}
                    </div>
                    <Separator orientation="horizontal" />
                    <div className="h-[70vh] w-full flex flex-row overflow-y-auto scrollbar-none">
                        <div className="flex flex-row w-full h-max">
                            <div className="flex flex-col w-12" style={{ paddingTop: 20 / 2 }}>
                                {[...hours].splice(1).map((hour, index) => (
                                    <div style={{ paddingTop: HOUR_HEIGHT - 20 }}>
                                        <div className="text-slate-500 text-sm">{format(hour, 'HH:mm')}</div>
                                    </div>
                                ))}
                            </div>
                            <Separator orientation="vertical" />
                            <div className="flex-1 relative h-full">
                                <div className="flex flex-row">
                                    {displayWeek.map((day, index) => (
                                        <div className="relative flex-1">
                                            <div className="flex flex-col border-r border-slate-200 flex-1">
                                                {hours.map((hour, index) => (
                                                    <div className="border-b border-slate-200" style={{ height: HOUR_HEIGHT }}></div>
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

export default Calendar;