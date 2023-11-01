'use client';;
import Fade from '@/components/Animation/Fade';
import supabase from '@/config/supabase';
import { Route, ScheduleItem, busDays, getVehicleDescription, routes, stops } from '@/const/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Divider, LinearProgress, Alert, ModalDialog, DialogTitle, DialogContent, ListItem, ListItemDecorator, FormControl, FormLabel, RadioGroup, Radio, FormHelperText, CircularProgress } from '@mui/joy';
import { format, formatDistanceStrict, formatISO, getDay, parse, parseISO, sub } from 'date-fns';
import { enUS, zhTW } from 'date-fns/locale';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Check, ChevronLeft, MapPin, X } from 'react-feather';
import useSWR from 'swr'
import RouteIcon from '@/components/BusIcons/RouteIcon';
import RoutesFilterChips from './RoutesFilterChips';
import useTime from '@/hooks/useTime';
import { useModal } from '@/hooks/contexts/useModal';
import { Controller, useForm } from 'react-hook-form';
import InputControl from '@/components/FormComponents/InputControl';
import MultiSelectControl from '@/components/FormComponents/MultiSelectControl';
import AutocompleteControl from '@/components/FormComponents/AutocompleteControl';
import RedLineIcon from '@/components/BusIcons/RedLineIcon';
import GreenLineIcon from '@/components/BusIcons/GreenLineIcon';
import NandaLineIcon from '@/components/BusIcons/NandaLineIcon';
import { Database } from '@/types/supabase';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

type SchoolBusType = { 
    label_zh: string, 
    label_en: string, 
    value: string 
}

type BusDelayReport = {
    route: SchoolBusType | null;
    time: string;
    problem: string;
    other_problem?: string;
}

const BusDelayReportDialog = ({ onClose }: { onClose: () => void }) => {

    const { control, setValue, watch, handleSubmit, formState: { isSubmitting, isValid } } = useForm<BusDelayReport>( {
        defaultValues: {
            route: null,
            time: '',
            problem: '',
        },
        mode: 'onChange'
    });

    const handleTimeNow = () => {
        setValue('time', format(new Date(), 'HH:mm'));
    }

    const onSubmit = async (data: BusDelayReport) => {
        await supabase.from('delay_reports').insert({
            route: data.route!.value,
            time: `${data.time}+08`,
            problem: data.problem,
            other_problem: data.other_problem ?? null,
        });
        onClose();
    }

    const isOtherProblem = watch('problem') == 'others';

    return <ModalDialog>
        <DialogTitle>誤點通報</DialogTitle>
        <DialogContent>
            <div className='space-y-4 py-3 flex flex-col overflow-hidden'>
                <FormControl>
                <FormLabel>原定發車時間</FormLabel>
                    <InputControl
                        control={control}
                        name='time'
                        type='time'
                        placeholder='時間'
                        rules={{ required: true }}
                        endDecorator={<Button variant='plain' color='neutral' onClick={handleTimeNow}>現在</Button>}
                        defaultValue={format(new Date(), 'HH:mm')}
                    />
                </FormControl>
                <FormControl>
                <FormLabel>線路</FormLabel>
                    <AutocompleteControl
                        control={control}
                        name="route"
                        placeholder='選擇線路'
                        rules={{ required: true }}
                        renderOption={(props, option) => (
                            <ListItem {...props}>
                                <ListItemDecorator>{option.icon}</ListItemDecorator>
                                <span className='flex-1'>{option.label_zh} {option.label_en}</span>
                            </ListItem>
                        )}
                        getOptionLabel={(option) => typeof option == 'string' ? option: (`${option.label_zh} ${option.label_en}`)}
                        isOptionEqualToValue={(option, value) => option.value == value.value}
                        options={[
                            { label_zh: '紅線', label_en: 'Red Line', value: 'R', icon: <RedLineIcon/> },
                            { label_zh: '綠線', label_en: 'Green Line', value: 'G', icon: <GreenLineIcon/> },
                            { label_zh: '南大線', label_en: 'Nanda Line', value: 'N', icon: <NandaLineIcon/> }
                        ]}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>問題</FormLabel>
                    <Controller
                        control={control}
                        name='problem'
                        rules={{ required: true }}
                        render={({ field: {value, onChange} }) => (
                            <RadioGroup name="problem-group" value={value} onChange={onChange}>
                                <Radio value='missing' label="沒有來" variant="outlined" />
                                <Radio value='early' label="早發車" variant="outlined" />
                                <Radio value='others' label="其他" variant="outlined" />
                            </RadioGroup>
                        )}
                    />
                </FormControl>
                {isOtherProblem && 
                <InputControl
                    control={control}
                    name='other_problem'
                    placeholder='其他問題'
                />}
                <FormHelperText>
                    謝謝你的通報！
                </FormHelperText>
                <Button variant='solid' color='warning' onClick={handleSubmit(onSubmit)} disabled={!isValid || isSubmitting}>
                    {isSubmitting? <CircularProgress/>: "提交"}
                </Button>
            </div>
        </DialogContent>
    </ModalDialog>
}

const BusDelayReportAlert = () => {
    const [show, setShow] = useState(false);
    const [openModal, closeModal] = useModal();
    // Wait for 30 seconds before showing the alert
    useEffect(() => {
        const WAIT_TIME = 30 * 1000;
        // const WAIT_TIME = 1 * 1000;
        const timeout = setTimeout(() => setShow(true), WAIT_TIME);
        return () => clearTimeout(timeout);
    }, []);

    const handleNoDelay = () => {
        setShow(false);
    }

    const handleDelay = () => {
        openModal({
            children: <BusDelayReportDialog onClose={() => {
                closeModal();
                setShow(false);
            }}/>
        })
    }

    if(!show) return <></>;
    
    return <div className='absolute bottom-0 p-3 w-full bg-gradient-to-t from-gray-500/50 dark:from-neutral-900/50 to-transparent'>
        <Alert variant='outlined' color='neutral' sx={{ width: '100%' }}>
            <div className='flex flex-col w-full'>
                <h3 className='font-bold text-lg'>誤點嗎？</h3>
                <p className='text-sm'>如果有看到嚴重的誤點，系統會自動提醒其他同學哦</p>
                <div className='flex flex-row justify-end'>
                    <Button variant='plain' color='warning' startDecorator={<Check/>} onClick={handleDelay}>有</Button>
                    <Button variant='plain' color='success' startDecorator={<X/>} onClick={handleNoDelay}>沒有</Button>
                </div>
            </div>
        </Alert>
    </div>
}

const BusDelayAlert = () => {
    const [show, setShow] = useState(false);
    const [reports, setReports] = useState<Database['public']['Tables']['delay_reports']['Row'][]>([]);
    const [text, setText] = useState<string>('');
    const time = useTime();

    useEffect(() => {
        //get all delay reports in the last 30 minutes
        supabase.from('delay_reports').select('*').gt('created_at', formatISO(sub(Date.now(), { minutes: 30 }))).then(({ data, error }) => {
            if(error) throw error;
            if(!data) throw new Error('No data');
            if(data.length == 0) return;
            setReports(data);
        })
    }, [])

    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'delay_reports',
                },
                (payload: RealtimePostgresInsertPayload<Database['public']['Tables']['delay_reports']['Row']>) => {
                    const { new: mod } = payload;
                    if(mod.route == null) return;
                    setReports((reports) => {
                        if(reports.find(report => report.id == mod.id)) return reports;
                        return [...reports, mod]
                    });
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe();
        }
    },[]);

    useEffect(() => {
        //Filter reports that are 30 minutes old
        const filteredReports = reports.filter(mod => parseISO(mod.created_at).getTime() > Date.now() - 30 * 60 * 1000);
        if(filteredReports.length == 0) {
            setShow(false);
            return;
        }
        else {

            console.log(reports)
            const routes = Array.from(new Set(reports.map(mod => mod.route)));
            const routeNames = routes.map(route => {
                switch(route) {
                    case 'R': return '紅線';
                    case 'G': return '綠線';
                    case 'N': return '南大線';
                }
            })
            setText(`誤點通報！影響的綫路有：${routeNames.join('、')}`);
            setShow(true);
        }
    }, [reports, time])

    if(!show) return <></>;

    return <div className='p-3'>
        <Alert variant='solid' color='warning' startDecorator={<AlertTriangle/>}>
        {text}
        </Alert>
    </div>
}

type PageProps = {
    params: { stopId: string }
}

const BusStop = ({ params: { stopId } }: PageProps) => {
    const dict = useDictionary();
    const { language } = useSettings();
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