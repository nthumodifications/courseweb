'use client';;
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusDepartureDetails, LineInfo } from '@/app/[lang]/(mods-pages)/bus/[route]/page.actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useParams, useRouter } from 'next/navigation';
import { HTMLProps, SVGProps, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { GreenLineIcon } from '@/components/BusIcons/GreenLineIcon';
import { RedLineIcon } from '@/components/BusIcons/RedLineIcon';
import { exportNotes, getTimeOnDate } from '@/helpers/bus';
import useTime from '@/hooks/useTime';
import useDictionary from '@/dictionaries/useDictionary';
import { Language } from '@/types/settings';
import { cn } from '@/lib/utils';
import { eachHourOfInterval, format, isThisHour, isWeekend } from 'date-fns';
import { NandaLineIcon } from '@/components/BusIcons/NandaLineIcon';

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
    const time = useTime();
    const dict = useDictionary();


    const renderBusSchedule = (busUp: BusDepartureDetails[], busDown: BusDepartureDetails[]) => {
        const transformedBusesUp = busUp.map(m => exportNotes(m, lang));
        const transformedBusesDown = busDown.map(m => exportNotes(m, lang));

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

        return <Table className='border border-border'>
            <TableHeader>
                <TableRow>
                    <TableCell className="font-semibold text-center border border-border py-2">{up.title}</TableCell>
                    <TableCell className="font-semibold text-center border border-border py-2">{down.title}</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mergedBuses.map((bus, i) => (
                    <TableRow key={i}>
                        <TableCell className={cn("text-slate-800 dark:text-neutral-200 border border-border", getTimeOnDate(time, bus.up.time) < time ? 'opacity-30' : '')} data-time={bus.up.time}>
                            <div className="flex flex-row gap-2 items-center">
                                <div className='flex flex-row gap-2 items-center flex-1'>
                                    {bus.up.route == '校園公車' && <div className="text-slate-800 dark:text-neutral-200">
                                        {bus.up.line == 'green' ? <GreenLineIcon width={15} height={15} /> : <RedLineIcon width={15} height={15} />}
                                    </div>}
                                    {bus.up.route == '南大區間車' && <div className="text-slate-800 dark:text-neutral-200">
                                        <NandaLineIcon width={15} height={15} />
                                    </div>}
                                    <div className="text-slate-800 dark:text-neutral-200">{bus.up.route == '校園公車' ? bus.up.dep_stop : up.title}</div>
                                </div>
                                
                                <div className="text-slate-800 dark:text-neutral-200">{bus.up.time}</div>
                            </div>
                        </TableCell>
                        <TableCell className={cn("text-slate-800 dark:text-neutral-200 border border-border", getTimeOnDate(time, bus.down.time) < time ? 'opacity-30' : '')} data-time={bus.down.time}>
                            <div className="flex flex-row gap-2 items-center">
                                <div className='flex flex-row gap-2 items-center flex-1'>
                                    {bus.down.route == '校園公車' && <div className="text-slate-800 dark:text-neutral-200">
                                        {bus.down.line == 'green' ? <GreenLineIcon width={15} height={15} /> : <RedLineIcon width={15} height={15} />}
                                    </div>}
                                    {bus.down.route == '南大區間車' && <div className="text-slate-800 dark:text-neutral-200">
                                        <NandaLineIcon width={15} height={15} />
                                    </div>}
                                    <div className="text-slate-800 dark:text-neutral-200">{bus.down.route == '校園公車' ? bus.down.dep_stop : down.title}</div>
                                </div>
                                <div className="text-slate-800 dark:text-neutral-200">{bus.down.time}</div>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    }
    const router = useRouter();

    const scrollToClosestTime = (now: Date) => {
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
        const latestBus = getTimeOnDate(now, lastBusUp.time) > getTimeOnDate(now, lastBusDown.time) ? busesUp : busesDown;
        // scan from first to last, if current time is past the bus time, set it as the closest time
        let closestTime = latestBus[0];
        for (const bus of latestBus) {
            const [hour, minute] = bus.time.split(':').map(Number);
            const busTime = new Date();
            busTime.setHours(hour, minute);
            if (busTime < now) {
                closestTime = bus;
            } else {
                break;
            }
        }

        const closestTimeElement = document.querySelector(`[data-time="${closestTime.time}"]`);
        if (closestTimeElement) {
            closestTimeElement.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    // generate hours for the day from 7am to 11pm
    const hoursDate = eachHourOfInterval({
        start: new Date().setHours(7, 0, 0, 0),
        end: new Date().setHours(22, 0, 0, 0)
    });

    // scroll time selector to the closest time
    const timeSelectorRef = useRef<HTMLDivElement>(null);
    const scrollTimeSelector = (date: Date) => {
        const closestHour = hoursDate.reduce((prev, curr) => Math.abs(curr.getTime() - date.getTime()) < Math.abs(prev.getTime() - date.getTime()) ? curr : prev);
        const closestHourIndex = hoursDate.indexOf(closestHour);
        const closestHourElement = timeSelectorRef.current?.children[0].children[closestHourIndex] as HTMLElement;
        if (closestHourElement) {
            closestHourElement.scrollIntoView();
        }
    }

    useEffect(() => {
        scrollToClosestTime(new Date());
        scrollTimeSelector(new Date());
    }, [up.weekday, up.weekend, down.weekday, down.weekend]);

    return (
        <div className="flex flex-col px-4 gap-4 h-full">
            <div className="flex flex-row items-center px-2 gap-4">
                <Button onClick={() => router.push(`/${lang}/bus`)} size='sm' variant='ghost' className='px-0' ><ChevronLeft /></Button>
                {routes.map(({ Icon, title }) => (
                    <div className="flex flex-row gap-4 items-center" key={title}>
                        <Icon />
                        <h3 className="text-slate-800 dark:text-neutral-200 font-bold">{title}</h3>
                    </div>
                ))}
            </div>
            <Tabs defaultValue="weekday" value={weektab} onValueChange={v => setWeektab(v as "weekday" | "weekend")}>
                <div className='w-full sticky top-0 z-50 bg-background'>
                    <TabsList className="w-full">
                        <TabsTrigger className="flex-1" value="weekday">{dict.bus.weekdays}</TabsTrigger>
                        <TabsTrigger className="flex-1" value="weekend">{dict.bus.weekends}</TabsTrigger>
                    </TabsList>
                    <div className='flex flex-col gap-4 py-2' ref={timeSelectorRef}>
                        <div className="justify-start items-start gap-1.5 inline-flex max-w-full overflow-x-auto">
                            {hoursDate.map(hd => <div className={cn("px-4 py-2 bg-white rounded-md border-2  justify-center items-center gap-2 flex cursor-pointer", isThisHour(hd) ? "border-violet-500": "border-slate-200")} key={hd.toString()} onClick={() => scrollToClosestTime(hd)}>
                                <div className="text-slate-900 text-sm font-medium font-['Inter'] leading-normal w-max">{/* 7 am */}{format(hd, 'h a')}</div>
                            </div>)}
                        </div>
                    </div>
                </div>
                <TabsContent value="weekday">
                    {renderBusSchedule(up.weekday, down.weekday)}
                </TabsContent>
                <TabsContent value="weekend">
                    {renderBusSchedule(up.weekend, down.weekend)}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default BusDetailsContainer;