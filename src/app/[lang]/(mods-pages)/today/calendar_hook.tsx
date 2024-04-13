'use client';;
import { useContext, createContext, FC, PropsWithChildren, useRef, useMemo } from 'react';
import { CalendarEvent, CalendarEventInternal, DisplayCalendarEvent } from '@/app/[lang]/(mods-pages)/today/calendar.types';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useRxCollection, useRxDB, useRxQuery } from 'rxdb-hooks';
import { timetableToCalendarEvent } from './timetableToCalendarEvent';
import { createTimetableFromCourses } from '@/helpers/timetable';
import supabase from '@/config/supabase';
import { MinimalCourse } from '@/types/courses';
import { toast } from '@/components/ui/use-toast';
import { getDiffFunction, getDisplayEndDate } from './calendar_utils';
import { subDays } from 'date-fns';

export enum UpdateType {
    THIS = 'THIS',
    FOLLOWING = 'FOLLOWING',
    ALL = 'ALL'
}

export const calendarContext = createContext<ReturnType<typeof useCalendarProvider>>({} as any);

export const useCalendar = () => useContext(calendarContext);

export const useCalendarProvider = () => {
    const HOUR_HEIGHT = 48;

    const db = useRxDB();
    const eventsCol = useRxCollection('events')
    const { result: eventStore } = useRxQuery(eventsCol?.find());
    const events = useMemo(() => {
        return eventStore.map((e) => {
            const event = e.toJSON() as CalendarEventInternal;
            return {
                ...event,
                start: new Date(event.start),
                end: new Date(event.end),
                repeat: event.repeat ? {
                    ...event.repeat,
                    ...('date' in event.repeat ? { date: new Date(event.repeat.date) } : {})
                } : null
            }
        })
    }, [eventStore])

    console.log(events)


    const { courses, colorMap } = useUserTimetable();

    const weekContainer = useRef<HTMLDivElement>(null);

    const addEvent = async (event: CalendarEvent) => {
        await eventsCol!.upsert({
            ...event,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
            repeat: event.repeat ? {
                ...event.repeat,
                ...('date' in event.repeat ? { date: event.repeat.date.toISOString() } : {})
            } : null,
            actualEnd: getDisplayEndDate(event)
        });
    }

    const removeEvent = async (event: DisplayCalendarEvent, type?: UpdateType) => {
        if (!event.repeat) {
            await eventsCol!.findOne(event.id).remove();
            return;
        }
        else {
            console.log('remove event', event, type)
            switch(type) {
                case UpdateType.THIS:
                    // add this date to excluded dates
                    await eventsCol!.findOne(event.id).update({
                        $set: {
                            actualEnd: getDisplayEndDate(event),
                            excludedDates: [...(event.excludedDates || []), event.displayStart]
                        }
                    });
                    break;
                case UpdateType.FOLLOWING:
                    //set the repeat end date to the new event start date
                    const newEvent = {
                        ...event,
                        repeat: {
                            ...event.repeat!,
                            count: undefined,
                            date: subDays(event.displayStart, 1),
                        },
                    }
                    await eventsCol!.findOne(event.id).update({
                        $set: {
                            ...newEvent,
                            actualEnd: getDisplayEndDate(newEvent)
                        }
                    });
                    break;
                case UpdateType.ALL:
                    //remove all events
                    //@ts-ignore
                    await eventsCol!.find({ selector: { parentId: event.id } }).remove();
                    await eventsCol!.findOne(event.id).remove();
                    break;
            }
        }
    }

    const updateEvent = async (newEvent: DisplayCalendarEvent, type?: UpdateType) => {
        console.log('update event', newEvent, type)
        const oldEvent = events.find(e => e.id === newEvent.id);
        if (!oldEvent) return;
        if(!oldEvent.repeat && !newEvent.repeat) {
            await eventsCol!.findOne(newEvent.id).update({
                $set: {
                    ...newEvent,
                    actualEnd: getDisplayEndDate(newEvent)
                }
            });
            return;
        }
        else if(oldEvent.repeat && newEvent.repeat) {
            switch(type) {
                case UpdateType.THIS:
                    //add this event to the list of excluded dates
                    await eventsCol!.findOne(newEvent.id).update({
                        $set: {
                            actualEnd: getDisplayEndDate(oldEvent),
                            excludedDates: [...(oldEvent.excludedDates || []), newEvent.displayStart]
                        }
                    });
                    const newEvent1 = {
                        ...newEvent,
                        id: newEvent.id + newEvent.start.toISOString(),
                        parentId: newEvent.id,
                        repeat: null
                    }
                    await eventsCol!.insert({
                        ...newEvent1,
                        actualEnd: getDisplayEndDate(newEvent1)
                    });
                    break;
                case UpdateType.FOLLOWING:
                    //set the repeat end date to the new event start date
                    const newEvent2 = {
                        ...oldEvent,
                        repeat: {
                            ...oldEvent.repeat!,
                            count: undefined,
                            date: subDays(newEvent.start, 1),
                        },
                    }
                    await eventsCol!.findOne(newEvent.id).update({
                        $set: {
                            ...newEvent2,
                            actualEnd: getDisplayEndDate(newEvent2)
                        }
                    });
                    let newEvent3;
                    if('count' in oldEvent.repeat) {
                        //if oldEvent was using count, find how many counts to subtract
                        //oldEvent.start => newEvent.start = x * interval
                        const interval = oldEvent.repeat.interval || 1;
                        const x = Math.floor(getDiffFunction(oldEvent.repeat.type)(newEvent.start, oldEvent.start) / interval);
                        newEvent3 = {
                            ...newEvent,
                            id: newEvent.id + newEvent.start.toISOString(),
                            parentId: newEvent.id,
                            repeat: {
                                ...oldEvent.repeat,
                                count: oldEvent.repeat.count - x
                            }
                        }
                    } else {
                        newEvent3 = {
                            ...newEvent,
                            id: newEvent.id + newEvent.start.toISOString(),
                            parentId: newEvent.id,
                            repeat: oldEvent.repeat
                        }
                    }
                    await eventsCol!.insert({
                        ...newEvent3,
                        actualEnd: getDisplayEndDate(newEvent3)
                    });
                    break;
                case UpdateType.ALL:
                    //just update the event
                    const newEvent4 =  {
                        ...newEvent,
                        start: oldEvent.start,
                        end: oldEvent.end,
                    }
                    await eventsCol!.findOne(newEvent.id).update({
                        $set: {
                            ...newEvent4,
                            actualEnd: getDisplayEndDate(newEvent4)
                        }
                    });
                    break;
            }
        }
            
    }

    useMemo(() => {
        if (!db) return;
        if (!eventsCol) return;
        (async () => {
            if (courses) {
                const timetable = [];
                for (const semester in courses) {
                    const { data: coursesData, error } = await supabase.from('courses').select('*').in('raw_id', courses[semester]);
                    if (error) console.error(error);
                    if (coursesData) timetable.push(timetableToCalendarEvent(createTimetableFromCourses(coursesData as unknown as MinimalCourse[], colorMap)))
                }
                for (const event of timetable.flat()) {
                    addEvent(event);
                }
                console.log('sync timetable to events complete')
            }
        })()
    }, [db, courses, colorMap, eventsCol])


    return {
        events,
        addEvent,
        removeEvent,
        updateEvent,
        weekContainer,
        HOUR_HEIGHT
    }

}

export const CalendarProvider: FC<PropsWithChildren> = ({ children }) => {
    const value = useCalendarProvider();
    return <calendarContext.Provider value={value}>
        {children}
    </calendarContext.Provider>
}
