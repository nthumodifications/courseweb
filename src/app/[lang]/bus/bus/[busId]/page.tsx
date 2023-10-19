'use client';
import Fade from '@/components/Animation/Fade';
import GreenLineIcon from '@/components/BusIcons/GreenLineIcon';
import RedLineIcon from '@/components/BusIcons/RedLineIcon';
import supabase from '@/config/supabase';
import { routes, stops } from '@/const/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Checkbox, Chip, Divider, LinearProgress } from '@mui/joy';
import { format, add, formatDistanceStrict } from 'date-fns';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, MapPin } from 'react-feather';
import useSWR from 'swr';
import NandaLineIcon from '@/components/BusIcons/NandaLineIcon';
import RouteIcon from '@/components/BusIcons/RouteIcon';
type PageProps = {
    params: { busId: string }
}

type BusDetails = {
    route: {
        title_zh: string;
        title_en: string;
        color: string;
        code: string;
        path: string[];
    };
    stopSchedule: {
        stopDef: {
            name_zh: string;
            name_en: string;
            code: string;
        };
        arrival: Date;
    }[];
    id: number;
    route_name: string | null;
    schedule: string[] | null;
    vehicle: string | null;
}

const BusStop = ({ params: { busId } }: PageProps) => {
    const dict = useDictionary();
    const [date, setDate] = useState(new Date());

    const { language } = useSettings();
    const { data: busSchedule, error, isLoading } = useSWR(['bus_schedule', busId], async ([table, busId]) => {
        const { data: busses, error } = await supabase.from('bus_schedule').select('*').eq('id', busId);
        if(error || !busses[0]) throw error;
        return busses[0];
    })

    //update time every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setDate(new Date());
        }, 1 * 1000);
        return () => clearInterval(interval);
    }, []);

    //get list of routes that pass this stop

    const busData = useMemo(() => {
        if(!busSchedule) return undefined;
        const route = routes.find(route => route.code == busSchedule.route_name)!;
        const stopSchedule = route!.path.map((stop, index) => {
            const stopDef = stops.find(stopDef => stop.includes(stopDef.code))!;
            const time = busSchedule.schedule![index];
            return {stopDef, arrival: new Date(format(date, "yyyy-MM-dd ") + time)};
        })
        return {
            ...busSchedule,
            route,
            stopSchedule
        }
    }, [busSchedule, date]);

    return <Fade>
        {isLoading && <LinearProgress/>}
        <div>
            <Button variant='plain' startDecorator={<ChevronLeft/>} onClick={() => history.back()}>Back</Button>
            {busData && <>
            <div className='flex flex-row gap-4 items-center px-6 py-4'>
                <RouteIcon route_name={busData.route_name!} />
                <div className="flex flex-col">
                    <span className="text-lg font-bold">{busData.route.title_zh}</span>
                    <span className="text-xs">{busData.route.title_en}</span>
                </div>
                <p className='text-right flex-1'>
                    Now: {format(date, 'HH:mm')}
                </p>
            </div>
            <Divider/>
            <div className='flex flex-col divide-y divide-gray-200 dark:divide-neutral-800'>
                {busData.stopSchedule.map(mod => 
                <div key={mod.stopDef.code} className='grid grid-cols-[40px_auto_102px] px-2 py-2'>
                    <div className='px-3 py-1 self-center'>
                        <MapPin/>                    
                    </div>
                    <div className='flex flex-col px-2 pt-1'>
                        <h4 className='font-bold'>{language == 'zh' ? mod.stopDef.name_zh: mod.stopDef.name_en}</h4>
                        <h5 className='text-sm text-gray-500'>{mod.arrival.getTime() - date.getTime() < 0? 'Departed': 'Scheduled'}</h5>
                    </div>
                    <p className={`font-semibold text-end pr-3 self-center ${mod.arrival.getTime() - date.getTime() < 0? 'text-gray-400 dark:text-neutral-700': ''}`}>
                    {format(mod.arrival, 'HH:mm')}
                    </p>
                </div>)}
            </div>
            </>}
        </div>
    </Fade>
}

export default BusStop;