import {BusDirection, StopName, BusDay, BusStopArrivalResponse} from '@/const/bus';
import {format} from 'date-fns';

export const getBusStopArrivals = async (stopName: StopName, direction: BusDirection, day: BusDay, date: Date) => {
    const res = await fetch(`/api/nthusa/buses/stops/${stopName}/?bus_type=all&day=${day}&direction=${direction}&time=${format(date, 'HH:mm')}`);
    return await res.json() as BusStopArrivalResponse;
}