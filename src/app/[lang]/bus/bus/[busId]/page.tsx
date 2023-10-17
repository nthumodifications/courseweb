'use client';
import GreenLineIcon from '@/components/BusIcons/GreenLineIcon';
import RedLineIcon from '@/components/BusIcons/RedLineIcon';
import supabase from '@/config/supabase';
import { routes, stops } from '@/const/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Divider } from '@mui/joy';
import { format, add, formatDistanceStrict } from 'date-fns';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, MapPin } from 'react-feather';
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
    const [busData, setBusData] = useState<BusDetails>();

    const { language } = useSettings();


    //update time every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setDate(new Date());
        }, 1 * 1000);
        return () => clearInterval(interval);
    }, []);

    //get list of routes that pass this stop
    useEffect(() => {
    (async () => {
        const { data: busses } = await supabase.from('bus_schedule').select('*').eq('id', busId);
        const bus = busses![0];
        const route = routes.find(route => route.code == bus.route_name)!;
        const stopSchedule = route!.path.map((stop, index) => {
            const stopDef = stops.find(stopDef => stop.includes(stopDef.code))!;
            const time = bus.schedule![index];
            return {stopDef, arrival: new Date(format(date, "yyyy-MM-dd ") + time)};
        })
        const finalData = {
            ...bus,
            route,
            stopSchedule
        }
        console.log(finalData)
        setBusData(finalData)

        // setSchedules(routes!.map(mod => {
        //     //get the time of arrival at this stop
        //     const route = routesPassingStop.find(route => route.code == mod.route_name)
        //     const time = mod.schedule![route!.stopIndex];
        //     return {...mod, arrival: new Date(format(date, "yyyy-MM-dd ") + time), route: route! }
        // }).sort((a, b) => a.arrival.getTime() - b.arrival.getTime()));
    })();
    }, [busId]);

    if(busData == undefined) return <div>Loading...</div>

    return <div>
        <Button variant='plain' startDecorator={<ChevronLeft/>} onClick={() => history.back()}>Back</Button>
        <div className='flex flex-row gap-4 items-center px-6 py-4'>
            {busData.route_name?.startsWith('G') ? <GreenLineIcon/>: <RedLineIcon/>}
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
    </div>
}

export default BusStop;