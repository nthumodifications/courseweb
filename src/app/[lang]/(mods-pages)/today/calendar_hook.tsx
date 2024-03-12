'use client';
import {useContext, useState, createContext, FC, PropsWithChildren, useRef} from 'react';
import {CalendarEvent} from '@/app/[lang]/(mods-pages)/today/calendar.types';

export const calendarContext = createContext<ReturnType<typeof useCalendarProvider>>({} as any);

export const useCalendar = () => useContext(calendarContext);

export const useCalendarProvider = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const weekContainer = useRef<HTMLDivElement>(null);
    const HOUR_HEIGHT = 48;

    const addEvent = (event: CalendarEvent) => {
        setEvents([...events, event]);
    }

    const removeEvent = (event: CalendarEvent) => {
        setEvents(events.filter(e => e != event));
    }

    return {
        events,
        setEvents,
        addEvent,
        removeEvent,
        weekContainer,
        HOUR_HEIGHT
    }

}

export const CalendarProvider: FC<PropsWithChildren> = ({children}) => {
    const value = useCalendarProvider();
    return <calendarContext.Provider value={value}>
        {children}
    </calendarContext.Provider>
}
