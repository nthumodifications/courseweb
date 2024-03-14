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

export function* getRepeatedStartDays(event: CalendarEvent) {
    const days = [event.start];
    yield event.start;
    if (event.repeat) {
        let currDay = new Date(event.start);
        const { type, interval } = event.repeat;
        let addFunction;

        switch (type) {
            case 'daily':
                addFunction = addDays;
                break;
            case 'weekly':
                addFunction = addWeeks;
                break;
            case 'monthly':
                addFunction = addMonths;
                break;
            case 'yearly':
                addFunction = addYears;
                break;
            default:
                throw new Error('Invalid repeat type');
        }

        while (true) {
            //check if count is reached, if so, break
            if ('count' in event.repeat && days.length >= event.repeat.count) {
                break;
            }
            currDay = addFunction(currDay, interval ?? 1);
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

export const getWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({
        start: start,
        end: end
    });
};

