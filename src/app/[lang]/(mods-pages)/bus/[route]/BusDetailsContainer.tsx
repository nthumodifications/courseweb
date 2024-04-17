'use client';;
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {BusDepartureDetails, LineInfo} from '@/app/[lang]/(mods-pages)/bus/[route]/page.actions';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import { useParams, useRouter } from 'next/navigation';
import { HTMLProps, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { GreenLineIcon } from '@/components/BusIcons/GreenLineIcon';
import { RedLineIcon } from '@/components/BusIcons/RedLineIcon';
import { exportNotes, getTimeOnDate } from '@/helpers/bus';
import useTime from '@/hooks/useTime';

type BusDetailsContainerProps = {
    routes: {
        Icon: React.FC<HTMLProps<SVGElement>>;
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
    const { lang } = useParams();
    const [weektab, setWeektab] = useState<'weekday'|'weekend'>('weekday');
    const [direction, setDirection] = useState<'up'|'down'>('up');
    const time = useTime();

    const renderBusSchedule = (buses: BusDepartureDetails[]) => {
        const transformedBuses = buses.map(exportNotes);
        return <Table>
            <TableHeader>
                <TableRow>
                    {routes.length > 1 && <TableHead className="w-[80px]">路綫</TableHead>}
                    <TableHead className="w-[100px]">出發時間</TableHead>
                    <TableHead className="">備注</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
            {transformedBuses.map((bus) => (
                <TableRow key={bus.time} data-time={bus.time} className={getTimeOnDate(time, bus.time) < time ? 'opacity-30': ''}>
                    {bus.route == '校園公車' && <TableCell className="text-slate-800 dark:text-neutral-200 font-semibold">{bus.line == 'green' ? <GreenLineIcon/>: <RedLineIcon/>}</TableCell>}
                    <TableCell className="text-slate-800 dark:text-neutral-200 font-semibold">{bus.time}</TableCell>
                    <TableCell>
                        <div className="flex flex-row gap-2 items-center">
                            {bus.notes.map(note => <div className="h-5 px-2 py-1 bg-slate-100 dark:bg-neutral-800 rounded justify-center items-center gap-2 inline-flex">
                                <div className="text-center text-black dark:text-white text-sm font-medium">{note}</div>
                            </div>)}
                        </div>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
    }
    const router = useRouter();

    useEffect(() => {
        const scrollToClosestTime = () => {
            const now = new Date();
            const buses = direction === 'up' ? up.weekday : down.weekday;
            const lastBus = buses[buses.length - 1];
            if(getTimeOnDate(now, lastBus.time) < now) {
                return;
            }
            // scan from first to last, if current time is past the bus time, set it as the closest time
            let closestTime = buses[0];
            for (const bus of buses) {
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

        scrollToClosestTime();
    }, [direction, up.weekday, up.weekend, down.weekday, down.weekend]);

    return (
        <div className="flex flex-col px-2 gap-4 h-full">
            <div className="flex flex-row items-center px-2 gap-4">
                <Button onClick={() => router.push(`/${lang}/bus`)} size='sm' variant='ghost' className='px-0' ><ChevronLeft/></Button>
                {routes.map(({ Icon, title }) => (
                    <div className="flex flex-row gap-4 items-center" key={title}>
                        <Icon />
                        <h3 className="text-slate-800 dark:text-neutral-200 font-bold">{title}</h3>
                    </div>
                ))}
            </div>
            <Tabs defaultValue="up" value={direction} onValueChange={v => setDirection(v as "up" | "down")}>
                <TabsList className="w-full sticky top-0 z-50 shadow-md">
                    <TabsTrigger className="flex-1" value="up">往{up.title}</TabsTrigger>
                    <TabsTrigger className="flex-1" value="down">往{down.title}</TabsTrigger>
                </TabsList>
                <TabsContent value="up" className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-slate-500 dark:text-neutral-300 text-sm" dangerouslySetInnerHTML={{ __html: lang == 'zh' ? up.info.route : up.info.routeEN}}></p>
                        <p className="text-slate-500 dark:text-neutral-300 text-xs">有效期限：{up.info.duration}</p>
                    </div>
                    <Tabs defaultValue="weekday" value={weektab} onValueChange={v => setWeektab(v as "weekday" | "weekend")}>
                        <TabsList className="w-full sticky top-0 z-50 shadow-md">
                            <TabsTrigger className="flex-1" value="weekday">平日</TabsTrigger>
                            <TabsTrigger className="flex-1" value="weekend">假日</TabsTrigger>
                        </TabsList>
                        <TabsContent value="weekday">
                            {renderBusSchedule(up.weekday)}
                        </TabsContent>
                        <TabsContent value="weekend">
                            {renderBusSchedule(up.weekend)}
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                <TabsContent value="down" className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-slate-500 dark:text-neutral-300 text-sm" dangerouslySetInnerHTML={{ __html: lang == 'zh' ? down.info.route : down.info.routeEN}}></p>
                        <p className="text-slate-500 dark:text-neutral-300 text-xs">有效期限：{down.info.duration}</p>
                    </div>
                    <Tabs defaultValue="weekday" value={weektab} onValueChange={v => setWeektab(v as "weekday" | "weekend")}>
                        <TabsList className="w-full sticky top-0 z-50 shadow-md">
                            <TabsTrigger className="flex-1" value="weekday">平日</TabsTrigger>
                            <TabsTrigger className="flex-1" value="weekend">假日</TabsTrigger>
                        </TabsList>
                        <TabsContent value="weekday">
                            {renderBusSchedule(down.weekday)}
                        </TabsContent>
                        <TabsContent value="weekend">
                            {renderBusSchedule(down.weekend)}
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default BusDetailsContainer;