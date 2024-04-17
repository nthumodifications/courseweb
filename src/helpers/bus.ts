import { set } from "date-fns";
import {BusDepartureDetails} from '@/app/[lang]/(mods-pages)/bus/[route]/page.actions';

export const getTimeOnDate = (date: Date, time: string) => {
    const [hour, minute] = time.split(':').map(n => parseInt(n));
    return set(date, { hours: hour, minutes: minute });
}

export const exportNotes = (bus: BusDepartureDetails) => {
    const notes = [];
    if (bus.route == '校園公車' && bus.description) notes.push(bus.description);
    if (bus.route == '校園公車' && bus.dep_stop === "綜二 ") notes.push("綜二發車");
    if (bus.route == '南大區間車' && bus.description.includes("83號")) notes.push("83號");
    if (bus.route == '南大區間車' && bus.description.includes("週五停駛")) notes.push("週五停駛");
    return {
        ...bus,
        notes,
    };
}