'use client';;
import Fade from '@/components/Animation/Fade';
import { ScheduleItem, busDays, getVehicleDescription, routes, stops } from '@/const/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Divider, LinearProgress } from '@mui/joy';
import { format, formatDistanceStrict, getDay } from 'date-fns';
import { enUS, zhTW } from 'date-fns/locale';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronLeft, MapPin } from 'react-feather';
import useSWR from 'swr'
import RouteIcon from '@/components/BusIcons/RouteIcon';
import RoutesFilterChips from './RoutesFilterChips';
import useTime from '@/hooks/useTime';
import useSupabaseClient from '@/config/supabase_client';
import BusDelayAlert from '../../BusDelayAlert';
import BusDelayReportAlert from './BusDelayReportAlert';

type PageProps = {
    params: { stopId: string }
}

const BusStop = ({ params: { stopId } }: PageProps) => {
    const dict = useDictionary();
    const { language } = useSettings();
    const supabase = useSupabaseClient();

    //update time every 30 seconds
    const date = useTime();

    const routesPassingStop = routes.filter(route => route.path.includes(stopId)).map(route => ({...route, stopIndex: route.path.indexOf(stopId)}));
    const routeCodes = routesPassingStop.map(route => route.code);
    //get first letter of each routeCode as a unique array
    const routeCodesFirstLetter = Array.from(new Set(routeCodes.map(route => route[0])));

    const [displayRoutes, setDisplayRoutes] = useState<string[]>(routeCodesFirstLetter);

    const { data = [], error, isLoading } = useSWR(['bus_schedule', stopId], async ([table, stopId]) => {
        const { data: _data = [], error } = await supabase.from('bus_schedule').select('*').in('route_name', routeCodes);
        if(error) throw error;
        return _data;
    })

    const schedules = useMemo(() => data!.map(mod => {
        //get the time of arrival at this stop
        const route = routesPassingStop.find(route => route.code == mod.route_name)
        const time = mod.schedule![route!.stopIndex];
        return {...mod, arrival: new Date(format(date, "yyyy-MM-dd ") + time), route: route! }
    }).sort((a, b) => a.arrival.getTime() - b.arrival.getTime()), [data, date]);

    const stopDef = stops.find(stop => stopId.includes(stop.code));


    const schedulesToDisplay = useMemo(() => 
        schedules
            .filter(mod => mod.days.includes(busDays[getDay(date)]))
            .filter(mod => displayRoutes.includes(mod.route_name![0])) //Only show routes that are enabled
            .filter(mod => mod.arrival.getTime() > date.getTime()), //Only show buses that are not yet arrived
    [schedules, date]);

    const getDisplayTime = (mod: ScheduleItem) => {
        if(mod.arrival.getTime() - date.getTime() > 30 * 60 * 1000) {
            return format(mod.arrival, 'HH:mm');
        } else if(mod.arrival.getTime() - date.getTime() < 60 * 1000) {
            return '即將抵達';
        } else {
            return formatDistanceStrict(mod.arrival, date, { locale: language == 'zh' ? zhTW: enUS });
        }
    }
    
    return <Fade>
        <div>
            {isLoading && <LinearProgress/>}
            <Button variant='plain' startDecorator={<ChevronLeft/>} onClick={() => history.back()}>Back</Button>
            <div className='sticky top-0 bg-white dark:bg-neutral-900 shadow-md z-50'>
                <BusDelayAlert/>
                <div className='flex flex-row gap-4 items-center px-6 py-4'>
                    <MapPin/>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold">{stopDef?.name_zh} {stopId.endsWith('U') ? "上山": stopId.endsWith('D')?"下山": ""}</span>
                        <span className="text-xs">{stopDef?.name_en} - {stopId.endsWith('U') ? "Up": stopId.endsWith('D')?"Down": ""}</span>
                    </div>
                    <p className='text-right flex-1'>
                        Now: {format(date, 'HH:mm')}
                    </p>
                </div>
            </div>
            
            <Divider/>
            <RoutesFilterChips enabledRoutes={routeCodesFirstLetter} setFilter={setDisplayRoutes}/>
            <div className='flex flex-col divide-y divide-gray-200 dark:divide-neutral-800'>
                {schedulesToDisplay.length == 0 && <div className='text-center text-gray-500 py-4'>末班車已過 😥</div>}
                {schedulesToDisplay.map(mod => 
                <Link key={mod.id} href={`/${language}/bus/bus/${mod.id}`}>
                    <div key={mod.id} className='grid grid-cols-[50px_auto_102px] px-2 py-2'>
                        <div className='px-3 py-1'>
                            <RouteIcon route_name={mod.route_name!} />
                        </div>
                        <div className='flex flex-col px-2 pt-1'>
                            <h4 className='font-bold'>{language == 'zh' ? mod.route.title_zh: mod.route.title_en}</h4>
                            <h5 className='text-sm text-gray-500'>預計 • {getVehicleDescription(mod.vehicle)}</h5>
                        </div>
                        <p className="font-semibold text-end pr-3 self-center">
                        {getDisplayTime(mod)}
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