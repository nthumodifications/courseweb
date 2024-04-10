import { addDays, addMonths, addWeeks, addYears, eachDayOfInterval, endOfWeek, set, startOfWeek } from "date-fns";
import { CalendarEvent } from "./calendar.types";


export const eventsToDisplay = (events: CalendarEvent[], start: Date, end: Date) => {
    // keep events that are within the range, if repeated events, create new events for each repeated day, change the start and end date
    const newEvents = [];
    for (const event of events) {
        const repeatedDays = getRepeatedStartDays(event);
        for (const day of repeatedDays) {
            const newStart = set(event.start, { year: day.getFullYear(), month: day.getMonth(), date: day.getDate() });
            //get original difference
            const diff = event.end.getTime() - event.start.getTime();
            const newEnd = new Date(newStart.getTime() + diff);
            if ((newStart >= start && newStart <= end)) {
                newEvents.push({ ...event, start: newStart, end: newEnd });
            }
            // if later than end, break
            if (newStart > end) {
                break;
            }
        }
    }
    return newEvents;
};

const getAddFunc = (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    switch (type) {
        case 'daily':
            return addDays;
        case 'weekly':
            return addWeeks;
        case 'monthly':
            return addMonths;
        case 'yearly':
            return addYears;
    }
};

export function* getRepeatedStartDays(event: CalendarEvent) {
    const days = [event.start];
    yield event.start;
    if (event.repeat) {
        let currDay = new Date(event.start);
        const { type, interval } = event.repeat;

        while (true) {
            //check if count is reached, if so, break
            if ('count' in event.repeat && days.length >= event.repeat.count) {
                break;
            }
            currDay = getAddFunc(event.repeat.type)(currDay, interval ?? 1);
            //check if date is later than end date, if so, break
            if ('date' in event.repeat && currDay > event.repeat.date) {
                break;
            }
            days.push(new Date(currDay));
            yield new Date(currDay);
        }
    }

    return days;
}

export const getDisplayEndDate = (event: CalendarEvent) => {
    // if event is not bounded, return null
    if (event.repeat && !('count' in event.repeat) && !('date' in event.repeat)) {
        return null;
    }
    else if (!event.repeat) {
        return event.end;
    }
    // from count, calculate the end date 
    else if ('count' in event.repeat) {
        const endDate = getAddFunc(event.repeat.type)(event.end, event.repeat.count);
        return endDate;
    }
    // from date, calculate the end date
    else if ('date' in event.repeat) {
        // if daily, just return the end date with time set to the same as end
        if (event.repeat.type === 'daily') {
            return set(event.repeat.date, { hours: event.end.getHours(), minutes: event.end.getMinutes() });
        }
        // if weekly, find the same day of the week as the end date
        if (event.repeat.type === 'weekly') {
            //check if the day of the week is the same
            const diff = event.repeat.date.getDay() - event.end.getDay();
            const newDate = addDays(event.repeat.date, -diff);
            return set(newDate, { hours: event.end.getHours(), minutes: event.end.getMinutes() });
        }
        // if monthly, find the same day of the month as the end date
        if (event.repeat.type === 'monthly') {
            // set the date to the same day of the month, before the repeat date
            const newDate = set(event.repeat.date, { date: event.end.getDate() });
            // if the date is later than the repeat date, subtract a mon
            if (newDate > event.repeat.date) {
                return addMonths(newDate, -1);
            }
            return newDate;
        }
        // if yearly, find the same day of the year as the end date
        if (event.repeat.type === 'yearly') {
            // set the date to the same day of the year, before the repeat date
            const newDate = set(event.repeat.date, { date: event.end.getDate(), month: event.end.getMonth() });
            // if the date is later than the repeat date, subtract a year
            if (newDate > event.repeat.date) {
                return addYears(newDate, -1);
            }
            return newDate;
        }
    }
    return null;
}


export const getWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({
        start: start,
        end: end
    });
};

