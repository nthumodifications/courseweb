import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
    addMonths,
    addWeeks,
    getMonth,
    subMonths,
    subWeeks,
} from 'date-fns';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { CalendarEvent } from './calendar.types';
import { useCalendar } from './calendar_hook';
import { AddEventButton } from './AddEventButton';
import { getWeek } from './calendar_utils';
import { getMonthForDisplay } from '@/app/[lang]/(mods-pages)/today/calendar_utils';
import { CalendarDateSelector } from '@/app/[lang]/(mods-pages)/today/CalendarDateSelector';
import { CalendarWeekContainer } from './CalendarWeekContainer';
import { CalendarMonthContainer } from './CalendarMonthContainer';

const Calendar = () => {
    const [displayDates, setDisplayDates] = useState<Date[]>(getWeek(new Date()));
    const [displayMode, setDisplayMode] = useState<'week' | 'month'>('week');
    const { events, addEvent, displayContainer, HOUR_HEIGHT } = useCalendar();

    //week movers
    const moveBackward = () => {
        switch (displayMode) {
            case 'week':
                setDisplayDates(displayDates.map(d => subWeeks(d, 1)))
                break;
            case 'month':
                // get month of current center date
                const month = displayDates[Math.floor(displayDates.length / 2)];
                // subtract 1 month from the month
                setDisplayDates(getMonthForDisplay(subMonths(month, 1)));
                break;

        }
    }

    const moveForward = () => {
        switch (displayMode) {
            case 'week':
                setDisplayDates(displayDates.map(d => addWeeks(d, 1)))
                break;
            case 'month':
                // get month of current center date
                const month = displayDates[Math.floor(displayDates.length / 2)];
                // add 1 month from the month
                setDisplayDates(getMonthForDisplay(addMonths(month, 1)));
                break;
        }
    }

    const backToToday = () => {
        switch (displayMode) {
            case 'week':
                setDisplayDates(getWeek(new Date()));
                break;
            case 'month':
                setDisplayDates(getMonthForDisplay(new Date()));
                break;
        }
    }

    const setDate = (date: Date) => {
        switch (displayMode) {
            case 'week':
                setDisplayDates(getWeek(date));
                break;
            case 'month':
                setDisplayDates(getMonthForDisplay(date));
                break;
        }
    }

    const handleSwitchMode = (mode: 'week' | 'month') => {
        setDisplayMode(mode)
        switch (mode) {
            case 'week':
                setDisplayDates(getWeek(displayDates[0]));
                break;
            case 'month':
                setDisplayDates(getMonthForDisplay(displayDates[0]));
                break;
        }
    }

    const handleAddEvent = (data: CalendarEvent) => {
        addEvent(data)
    }

    const handleOnViewChange = (view: 'week' | 'month', date: Date) => {
        setDate(date);
        handleSwitchMode(view);
    }


    //listen to keypress events
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                displayContainer.current?.scrollBy(0, -HOUR_HEIGHT)
            } else if (e.key === 'ArrowDown') {
                displayContainer.current?.scrollBy(0, HOUR_HEIGHT)
            } else if (e.key === 'ArrowLeft') {
                moveBackward()
            } else if (e.key === 'ArrowRight') {
                moveForward()
            } else if (e.key === 't') {
                backToToday()
            } else if (e.key === 'w') {
                handleSwitchMode('week')
            } else if (e.key === 'm') {
                handleSwitchMode('month')
            }
        }
        window.addEventListener('keydown', handleKeyPress)
        return () => {
            window.removeEventListener('keydown', handleKeyPress)
        }
    }, [displayContainer, HOUR_HEIGHT, moveBackward, moveForward])

    return <div className="flex flex-col gap-6 flex-1">
        <div className="flex flex-col md:flex-row gap-2 justify-evenly">
            <div className="flex-1 w-full">
                <CalendarDateSelector date={displayDates[Math.floor(displayDates.length/2)]} setDate={setDate} />
            </div>
            <div className="flex flex-row items-center gap-2">
                <Select value={displayMode} onValueChange={(v) => handleSwitchMode(v as 'week' | 'month')}>
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
                <AddEventButton onEventAdded={handleAddEvent}>
                    <>
                        <Button className="hidden md:inline-flex"><Plus className="mr-2" /> 新增行程</Button>
                        <Button className="md:hidden fixed bottom-8 right-8 z-50 rounded-lg shadow-lg" size='icon'><Plus /></Button>
                    </>
                </AddEventButton>
            </div>
        </div>
        {displayMode == 'week' && <CalendarWeekContainer displayWeek={displayDates} />}
        {displayMode == 'month' && <CalendarMonthContainer displayMonth={displayDates} onChangeView={handleOnViewChange} />}
    </div>

}

export default Calendar;