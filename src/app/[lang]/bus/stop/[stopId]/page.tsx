'use client';;
import Fade from '@/components/Animation/Fade';
import supabase from '@/config/supabase';
import {busDays, getStopEn, stops, BusDirection, StopName, BusDay, BusStopArrivalResponse} from '@/const/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { format, formatDistanceStrict, getDay, set, setDate, setHours } from 'date-fns';
import { enUS, zhTW } from 'date-fns/locale';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import useSWR from 'swr'
import RouteIcon from '@/components/BusIcons/RouteIcon';
import RoutesFilterChips from './RoutesFilterChips';
import useTime from '@/hooks/useTime';
import BusDelayAlert from '../../BusDelayAlert';
import BusDelayReportAlert from './BusDelayReportAlert';
import { getBusStopArrivals } from '@/lib/nthusa';
import { Button } from '@/components/ui/button';
import { Divider } from '@mui/joy';

type PageProps = {
    params: { stopId: string }
}

const BusStop = ({ params: { stopId } }: PageProps) => {
    const dict = useDictionary();
    const { language } = useSettings();
    //update time every 30 seconds
    const date = useTime();

    const [stopIndex, direction] = stopId.split('_');
    const stopName = stops[parseInt(stopIndex)];
    
    // Validate stopName
    if(!stopName) {
        return <div>Invalid Stop</div>
    }

    //is date weekend or weekday
    const day = getDay(date) == 0 || getDay(date) == 6 ? 'weekend': 'weekday';
    const { data = [], error, isLoading } = useSWR<BusStopArrivalResponse>(['nthusa_bus', stopName, direction, day], async ([table, stopName, direction, day]) => {
        const dir = direction == 'U' ? 'up': 'down';
        // return await getBusStopArrivals(stopName as StopName, dir as BusDirection, day as BusDay, date);
        return await getBusStopArrivals(stopName as StopName, dir as BusDirection, 'weekday', setHours(date, 7));
    }, {
        keepPreviousData: true,
    })

    const getDisplayTime = (dt: Date) => {
        if(dt.getTime() - date.getTime() > 30 * 60 * 1000) {
            return format(dt, 'HH:mm');
        } else if(dt.getTime() - date.getTime() < 60 * 1000) {
            return '即將抵達';
        } else {
            return formatDistanceStrict(dt, date, { locale: language == 'zh' ? zhTW: enUS });
        }
    }

    const schedule = useMemo(() => {
        // datify the schedule and filter time
        return data.map(mod => {
            const [hours, minutes] = mod.arrive_time.split(':').map(Number);
            return {
                ...mod,
                arrive_time: set(date, { hours, minutes }),
                display_time: getDisplayTime(set(date, { hours, minutes }))
            };
        })
        // .filter(mod => mod.arrive_time.getTime() - date.getTime() > 0);
    }, [data, date])

    
    return <Fade>
        <div>
            {/* {isLoading && <LinearProgress/>} */}
            {/* <Button variant='plain' startDecorator={<ChevronLeft/>} onClick={() => history.back()}>Back</Button> */}
            <Button variant='ghost' size='sm' asChild>
                <Link href="../">
                    <ChevronLeft/> <span className='ml-2'>Back</span>
                </Link>
            </Button>
            <div className='sticky top-0 bg-white dark:bg-neutral-900 shadow-md z-50'>
                <BusDelayAlert/>
                <div className='flex flex-row gap-4 items-center px-6 py-4'>
                    <MapPin/>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold">{stopName} {direction == 'U' ? "上山": direction == 'D'?"下山": ""}</span>
                        <span className="text-xs">{getStopEn(stopName)} - {direction == 'U' ? "Up": direction == 'D'?"Down": ""}</span>
                    </div>
                    <p className='text-right flex-1'>
                        Now: {format(date, 'HH:mm')}
                    </p>
                </div>
            </div>
            
            {/* <RoutesFilterChips enabledRoutes={routeCodesFirstLetter} setFilter={setDisplayRoutes}/> */}
            <div className='flex flex-col divide-y divide-gray-200 dark:divide-neutral-800'>
                {schedule.length == 0 && <div className='text-center text-gray-500 py-4'>末班車已過 😥</div>}
                {schedule.map((mod, index) => 
                <Link key={index} href={`/${language}/bus/bus/${mod.bus_info.time}`}>
                    <div key={index} className='grid grid-cols-[50px_auto_102px] px-2 py-2'>
                        <div className='px-3 py-1'>
                            <RouteIcon route={mod.bus_info.route} line={mod.bus_info.line} />
                        </div>
                        <div className='flex flex-col px-2 pt-1'>
                            <h4 className='font-bold'>{mod.bus_info.dep_stop}</h4>
                            <h5 className='text-sm text-gray-500'>預計 • {mod.bus_info.description}</h5>
                        </div>
                        <p className="font-semibold text-end pr-3 self-center">
                        {mod.display_time}
                        </p>
                    </div>
                </Link>)}
            </div>
            {/* gradient from slight gray botttom of screen to middle */}
            <BusDelayReportAlert/>
        </div>
    </Fade>
}

export default BusStop;