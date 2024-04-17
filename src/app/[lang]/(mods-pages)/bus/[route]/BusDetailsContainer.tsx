'use client';;
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {BusDepartureDetails, LineInfo} from '@/app/[lang]/(mods-pages)/bus/[route]/page.actions';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import { useParams, useRouter } from 'next/navigation';
import { HTMLProps } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { GreenLineIcon } from '@/components/BusIcons/GreenLineIcon';
import { RedLineIcon } from '@/components/BusIcons/RedLineIcon';


const exportNotes = (bus: BusDepartureDetails) => {
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
                <TableRow>
                    {bus.route == '校園公車' && <TableCell className="text-slate-800 dark:text-neutral-200 font-semibold">{bus.line == 'green' ? <GreenLineIcon/>: <RedLineIcon/>}</TableCell>}
                    <TableCell className="text-slate-800 dark:text-neutral-200 font-semibold">{bus.time}</TableCell>
                    <TableCell className="">
                        {bus.notes.map(note => <div className="h-5 px-2 py-1 bg-slate-100 dark:bg-neutral-800 rounded justify-center items-center gap-2 inline-flex">
                            <div className="text-center text-black dark:text-white text-sm font-medium">{note}</div>
                        </div>)}
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
    }
    const router = useRouter();
    
    return (
        <div className="flex flex-col px-2 gap-4 h-full">
            <div className="flex flex-row items-center px-2 gap-4">
                <Button onClick={() => router.push(`/${lang}/bus`)} size='sm' variant='ghost' className='px-0' ><ChevronLeft/></Button>
                {routes.map(({ Icon, title }) => (
                    <div className="flex flex-row gap-4 items-center">
                        <Icon />
                        <h3 className="text-slate-800 dark:text-neutral-200 font-bold">{title}</h3>
                    </div>
                ))}
            </div>
            <Tabs defaultValue="up">
                <TabsList className="w-full sticky top-0 z-50 shadow-md">
                    <TabsTrigger className="flex-1" value="up">往{up.title}</TabsTrigger>
                    <TabsTrigger className="flex-1" value="down">往{down.title}</TabsTrigger>
                </TabsList>
                <TabsContent value="up" className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-slate-500 dark:text-neutral-300 text-sm" dangerouslySetInnerHTML={{ __html: lang == 'zh' ? up.info.route : up.info.routeEN}}></p>
                        <p className="text-slate-500 dark:text-neutral-300 text-xs">有效期限：{up.info.duration}</p>
                    </div>
                    <Tabs defaultValue="weekday">
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
                    <Tabs defaultValue="weekday">
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