'use client';;
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusDepartureDetails, LineInfo } from '@/app/[lang]/(mods-pages)/bus/[route]/page.actions';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { useParams, useRouter } from 'next/navigation';
import { SVGProps, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { GreenLineIcon } from '@/components/BusIcons/GreenLineIcon';
import { RedLineIcon } from '@/components/BusIcons/RedLineIcon';
import { exportNotes, getTimeOnDate } from '@/helpers/bus';
import useDictionary from '@/dictionaries/useDictionary';
import { Language } from '@/types/settings';
import { cn } from '@/lib/utils';
import { eachHourOfInterval, format, isSameHour, isWeekend, startOfHour } from 'date-fns';

type BusDetailsContainerProps = {
    routes: {
        Icon: React.FC<SVGProps<SVGSVGElement>>;
        title: string;
    }[]
    up: {
        title: string,
        info: LineInfo,
        weekday: BusDepartureDetails[],
        weekend: BusDepartureDetails[],
    },
    down: {
        title: string,
        info: LineInfo,
        weekday: BusDepartureDetails[],
        weekend: BusDepartureDetails[],
    },
}
const BusDetailsContainer = ({ routes, up, down }: BusDetailsContainerProps) => {
    const { lang } = useParams() as { lang: Language };
    const [weektab, setWeektab] = useState<'weekday' | 'weekend'>(isWeekend(new Date()) ? 'weekend' : 'weekday');
    const [selectedHour, setSelectedHour] = useState<Date>(startOfHour(new Date()));
    const dict = useDictionary();


    const renderBusSchedule = (busUp: BusDepartureDetails[], busDown: BusDepartureDetails[]) => {
        //only display busses after selected hour
        const transformedBusesUp = busUp.filter(b => getTimeOnDate(new Date(), b.time) >= selectedHour).map(m => exportNotes(m, lang));
        const transformedBusesDown = busDown.filter(b => getTimeOnDate(new Date(), b.time) >= selectedHour).map(m => exportNotes(m, lang));

        // create a merged list of buses, each row contains both up and down buses, each row {up: BusDepartureDetails, down: BusDepartureDetails
        const mergedBuses = useMemo(() => {
            const maxLen = Math.max(transformedBusesUp.length, transformedBusesDown.length);
            const merged = [];
            for (let i = 0; i < maxLen; i++) {
                merged.push({
                    up: transformedBusesUp[i],
                    down: transformedBusesDown[i]
                });
            }
            return merged;
        }, [transformedBusesUp, transformedBusesDown]);


        return <Table className='border border-border table-fixed'>
            <TableBody>
                {mergedBuses.map((bus, i) => (
                    <TableRow key={i}>
                        {bus.up ? <TableCell className={cn("text-slate-800 dark:text-neutral-200 border border-border")} data-time={bus.up.time}>
                            <div className="flex flex-row gap-2 items-center justify-center">
                                {bus.up.route == '校園公車' && <div className='flex flex-row gap-2 items-center flex-1'>
                                    <div className="text-slate-800 dark:text-neutral-200">
                                        {bus.up.line == 'green' ? <GreenLineIcon width={15} height={15} /> : <RedLineIcon width={15} height={15} />}
                                    </div>
                                    <div className="text-slate-800 dark:text-neutral-200">{bus.up.dep_stop}</div>
                                </div>}
                                <div className="text-slate-800 dark:text-neutral-200">{bus.up.time}</div>
                            </div>
                        </TableCell> : <TableCell></TableCell>}
                        {bus.down ? <TableCell className={cn("text-slate-800 dark:text-neutral-200 border border-border")} data-time={bus.down.time}>
                            <div className="flex flex-row gap-2 items-center justify-center">
                                {bus.down.route == '校園公車' && <div className='flex flex-row gap-2 items-center flex-1'>
                                    <div className="text-slate-800 dark:text-neutral-200">
                                        {bus.down.line == 'green' ? <GreenLineIcon width={15} height={15} /> : <RedLineIcon width={15} height={15} />}
                                    </div>
                                    <div className="text-slate-800 dark:text-neutral-200">{bus.down.dep_stop}</div>
                                </div>}
                                <div className="text-slate-800 dark:text-neutral-200">{bus.down.time}</div>
                            </div>
                        </TableCell> : <TableCell></TableCell>}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    }
    const router = useRouter();

    const scrollToClosestTime = (now: Date) => {
        console.log(now)
        // what day is today
        const busesUp = weektab == 'weekday' ? up.weekday : up.weekend;
        const busesDown = weektab == 'weekday' ? down.weekday : down.weekend;
        // get last bus of both up and down busses
        const lastBusUp = busesUp[busesUp.length - 1];
        const lastBusDown = busesDown[busesDown.length - 1];
        // if the last bus is already gone, do not scroll
        if (getTimeOnDate(now, lastBusUp.time) < now && getTimeOnDate(now, lastBusDown.time) < now) {
            return;
        }
        const mergedBuses = [...busesUp, ...busesDown].sort((a, b) => getTimeOnDate(now, a.time).getTime() - getTimeOnDate(now, b.time).getTime());

        
        // find a time that is just after or equal to the selected time
        let closestTime = mergedBuses[0];
        for (let i = 0; i < mergedBuses.length; i++) {
            if (getTimeOnDate(now, mergedBuses[i].time) >= now) {
                closestTime = mergedBuses[i];
                break;
            }
        }

        setTimeout(() => {
            const closestTimeElement = document.querySelector(`[data-time="${closestTime.time}"]`);
            if (closestTimeElement) {
                closestTimeElement.scrollIntoView({
                    behavior: 'auto',
                    block: 'center',
                });
            }
        }, 100);
    };
    
    // generate hours for the day from 7am to 11pm
    const hoursDate = eachHourOfInterval({
        start: new Date().setHours(7, 0, 0, 0),
        end: new Date().setHours(22, 0, 0, 0)
    })
    
    const filteredHoursDate = hoursDate.filter(h => up[weektab].some(b => isSameHour(getTimeOnDate(h, b.time), h) || down[weektab].some(b => isSameHour(getTimeOnDate(h, b.time), h))));


    // scroll time selector to the closest time
    const timeSelectorRef = useRef<HTMLDivElement>(null);
    const scrollTimeSelector = (date: Date) => {
        const closestHour = hoursDate.reduce((prev, curr) => Math.abs(curr.getTime() - date.getTime()) < Math.abs(prev.getTime() - date.getTime()) ? curr : prev);
        const closestHourIndex = hoursDate.indexOf(closestHour);
        const closestHourElement = timeSelectorRef.current?.children[0].children[closestHourIndex] as HTMLElement;
        if (closestHourElement) {
            closestHourElement.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center'
            });
            
        }
    }

    const handleTimeSelected = (hd: Date) => {
        setSelectedHour(hd);
        scrollToClosestTime(hd);
    }

    useEffect(() => {
        scrollTimeSelector(selectedHour);
    }, [selectedHour]);

    //when weektab changes, check if is weekend, if so, set the selected hour to the first bus of the weekend
    useEffect(() => {
        if (weektab == 'weekend') {
            const minTime = Math.min(...up.weekend.map(b => getTimeOnDate(new Date(), b.time).getTime()), ...down.weekend.map(b => getTimeOnDate(new Date(), b.time).getTime()));
            setSelectedHour(startOfHour(new Date(minTime)));
        } else {
            const minTime = Math.min(...up.weekday.map(b => getTimeOnDate(new Date(), b.time).getTime()), ...down.weekday.map(b => getTimeOnDate(new Date(), b.time).getTime()));
            setSelectedHour(startOfHour(new Date(minTime)));
        }
    }, [weektab]);

    return (
        <div className="flex flex-col px-4 h-full">
            <Tabs defaultValue="weekday" value={weektab} onValueChange={v => setWeektab(v as "weekday" | "weekend")}>
                <div className='w-full flex flex-col gap-4 sticky -top-8 pt-4 z-10 bg-background'>
                    <div className="flex flex-row items-center px-2 gap-4">
                        <Button onClick={() => router.push(`/${lang}/bus`)} size='sm' variant='ghost' className='px-0' ><ChevronLeft /></Button>
                        {routes.map(({ Icon, title }) => (
                            <div className="flex flex-row gap-4 items-center" key={title}>
                                <Icon />
                                <h3 className="text-slate-800 dark:text-neutral-200 font-bold">{title}</h3>
                            </div>
                        ))}
                    </div>
                    <TabsList className="w-full">
                        <TabsTrigger className="flex-1" value="weekday">{dict.bus.weekdays}</TabsTrigger>
                        <TabsTrigger className="flex-1" value="weekend">{dict.bus.weekends}</TabsTrigger>
                    </TabsList>
                    <div className='flex flex-col gap-4 py-2' ref={timeSelectorRef}>
                        <div className="justify-start items-start gap-1.5 inline-flex max-w-full overflow-x-auto">
                            {filteredHoursDate.length > 6 && filteredHoursDate.map(hd => <div className={cn("px-4 py-2 rounded-md border-2 justify-center items-center gap-2 flex cursor-pointer", !isSameHour(hd, selectedHour) ? "border-slate-200 dark:border-slate-700": "border-nthu-500")} key={hd.toString()} onClick={() => handleTimeSelected(hd)}>
                                <div className="text-slate-900 dark:text-slate-100 text-sm font-medium leading-normal w-max">{/* 7 am */}{format(hd, 'h a')}</div>
                            </div>)}
                        </div>
                    </div>
                    <Table className='border border-border table-fixed'>
                        <TableHeader>
                            <TableRow>
                                <TableCell className="font-semibold text-center border border-border py-2 w-1/2">{up.title}</TableCell>
                                <TableCell className="font-semibold text-center border border-border py-2 w-1/2">{down.title}</TableCell>
                            </TableRow>
                        </TableHeader>
                    </Table>
                </div>
                <TabsContent className='-mt-1' value="weekday">
                    {renderBusSchedule(up.weekday, down.weekday)}
                </TabsContent>
                <TabsContent className='-mt-1' value="weekend">
                    {renderBusSchedule(up.weekend, down.weekend)}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default BusDetailsContainer;