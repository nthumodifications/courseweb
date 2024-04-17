'use client';;
import { useSettings } from "@/hooks/contexts/settings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FC, HTMLProps, useMemo, useState } from "react";
import useTime from "@/hooks/useTime";
import { useQuery } from "@tanstack/react-query";
import { getBusesSchedules } from "./page.actions";
import { addMinutes, format, set } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { useRouter } from "next/navigation";

type BusListingItemProps = { refTime: Date, Icon: FC<HTMLProps<SVGElement>>, line: string, title: string, destination?: string, notes?: string[], arrival: string }
const BusListingItem = ({ refTime, Icon, line, title, destination, notes = [], arrival }: BusListingItemProps) => {
    const { language } = useSettings();
    const displayTime = useMemo(() => {
        // check if is time, else return as is
        if (!arrival.match(/\d{2}:\d{2}/)) return arrival;
        const time_arr = set(new Date(), { hours: parseInt(arrival.split(":")[0]), minutes: parseInt(arrival.split(":")[1]) });
        // if now - time < 1 minutes, display "即將發車"
        if (time_arr.getTime() < refTime.getTime()) {
            return "已過站";
        }
        else if (time_arr.getTime() - refTime.getTime() < 1 * 60 * 1000) {
            return "即將發車";
        }
        return arrival;
    }, [arrival]);

    const router = useRouter();
    const route = line == 'nanda' ? 'nanda' : 'main';

    return <div className={cn("flex flex-row py-4 items-center gap-4 cursor-pointer", arrival == '末班車已過' ? 'opacity-30': '')} onClick={() => router.push(`/${language}/bus/${route}`)}>
        <Icon className="h-7 w-7" />
        <div className="flex flex-row flex-wrap gap-2">
            <h3 className="text-slate-800 font-bold">
                <span>{title}</span>
                {destination && <span>-{destination}</span>}
            </h3>
            {notes.map(note => <div className="h-5 px-2 py-1 bg-slate-100 rounded justify-center items-center gap-2 inline-flex">
                <div className="text-center text-black text-sm font-medium">{note}</div>
            </div>)}
        </div>
       
        <div className={cn("flex-1 text-right text-slate-800 font-bold whitespace-nowrap", displayTime == '即將發車' ? 'text-lime-500': '')}>{displayTime}</div>
        <div className="grid place-items-center">
            <ChevronRight className="w-4 h-4"/>
        </div>
    </div>
}

const getTimeOnDate = (date: Date, time: string) => {
    const [hour, minute] = time.split(':').map(n => parseInt(n));
    return set(date, { hours: hour, minutes: minute });
}

const BusPage = () => {
    const { language } = useSettings();
    const time = useTime();
    const [tab, setTab] = useState('north_gate');

    const { data: UphillBuses = [], error } = useQuery({
        queryKey: ['buses_up'],
        queryFn: () => getBusesSchedules('all', 'all', 'up'),
    });

    const { data: DownhillBuses = [], error: error2 } = useQuery({
        queryKey: ['buses_down'],
        queryFn: () => getBusesSchedules('all', 'all', 'down'),
    });
    
    const displayBuses = useMemo(() => {
        const returnData: (Omit<BusListingItemProps, 'refTime'> & {
            line: 'red' | 'green' | 'nanda' | 'tld';
        })[] = [];
        if (tab === 'north_gate') {
            for (const bus of UphillBuses.filter(bus => getTimeOnDate(time, bus.time).getTime() > time.getTime())) {
                if (bus.route === '校園公車') {
                    const notes = [];
                    if (bus.description) notes.push(bus.description);
                    if (bus.dep_stop === "綜二 ") notes.push("綜二發車");
                    if (bus.line === 'red') {
                        if(returnData.some((bus) => bus.line === 'red')) continue;
                        returnData.push({
                            Icon: RedLineIcon,
                            line: 'red',
                            title: "紅線",
                            notes,
                            arrival: bus.time,
                        });
                    } else if (bus.line === 'green') {
                        if(returnData.some((bus) => bus.line === 'green')) continue;
                        returnData.push({
                            Icon: GreenLineIcon,
                            line: 'green',
                            title: "綠線",
                            notes,
                            arrival: bus.time,
                        });
                    }
                } else if (bus.route === '南大區間車') {
                    if(returnData.some((bus) => bus.line === 'nanda')) continue;
                    if(bus.description == "週五停駛" && time.getDay() === 5) continue;
                    const notes = [];
                    if(bus.description.includes("83號")) notes.push("83號");
                    returnData.push({
                        Icon: NandaLineIcon,
                        line: 'nanda',
                        title: '南大校車',
                        destination: '往南大校區',
                        notes,
                        arrival: bus.time,
                    });
                }
            }
        } else if (tab === 'tsmc') {
            // SCHOOL BUS DOWNHILL FROM TSMC
            for (const bus of DownhillBuses.filter(bus => getTimeOnDate(time, bus.time).getTime() > time.getTime())) {
                if (bus.route === '校園公車') {
                    const notes = [];
                    if (bus.description) notes.push(bus.description);
                    if (bus.dep_stop === "綜二 ") notes.push("綜二發車");
                    if (bus.line === 'red') {
                        if(returnData.some((bus) => bus.line === 'red')) continue;
                        returnData.push({
                            Icon: RedLineIcon,
                            line: 'red',
                            title: "紅線",
                            notes,
                            arrival: bus.time,
                        });
                    } else if (bus.line === 'green') {
                        if(returnData.some((bus) => bus.line === 'green')) continue;
                        returnData.push({
                            Icon: GreenLineIcon,
                            line: 'green',
                            title: "綠線",
                            notes,
                            arrival: bus.time,
                        });
                    }
                }
            }
            // NANDA BUS UPHILL TO NANDA (filter busses that left 7 minutes ago, and new time is arrive time + 7 minutes)
            for (const bus of UphillBuses.filter(bus => bus.route === '南大區間車').filter(bus => addMinutes(getTimeOnDate(time, bus.time).getTime(), 7).getTime() > time.getTime())) {
                if (bus.route === '南大區間車') {
                    if(returnData.some((bus) => bus.line === 'nanda')) continue;
                    if(bus.description == "週五停駛" && time.getDay() === 5) continue;
                    const notes = [];
                    if(bus.description.includes("83號")) notes.push("83號");
                    returnData.push({
                        Icon: NandaLineIcon,
                        line: 'nanda',
                        title: '南大校車',
                        destination: '往南大校區',
                        notes,
                        arrival: format(addMinutes(getTimeOnDate(time, bus.time).getTime(), 7), 'HH:mm'),
                    });
                }
            }

            //sort by time
            returnData.sort((a, b) => {
                return getTimeOnDate(time, a.arrival).getTime() - getTimeOnDate(time, b.arrival).getTime();
            });
        } else if (tab === 'nanda') {
            for (const bus of DownhillBuses.filter(bus => getTimeOnDate(time, bus.time).getTime() > time.getTime()).filter(bus => bus.route === '南大區間車')) {
                if(returnData.some((bus) => bus.line === 'nanda')) continue;
                if(bus.description == "週五停駛" && time.getDay() === 5) continue;
                const notes = [];
                if(bus.description.includes("83號")) notes.push("83號");
                returnData.push({
                    Icon: NandaLineIcon,
                    line: 'nanda',
                    title: '南大校車',
                    destination: '往校本部',
                    notes,
                    arrival: bus.time,
                });
            }
        }

        // filler for no service busses
        if(!returnData.some((bus) => bus.line === 'red') && tab != 'nanda') {
            returnData.push({
                Icon: RedLineIcon,
                line: 'red',
                title: "紅線",
                arrival: "末班車已過",
            });
        }
        if(!returnData.some((bus) => bus.line === 'green') && tab != 'nanda') {
            returnData.push({
                Icon: GreenLineIcon,
                line: 'green',
                title: "綠線",
                arrival: "末班車已過",
            });
        }
        if(!returnData.some((bus) => bus.line === 'nanda')) {
            returnData.push({
                Icon: NandaLineIcon,
                line: 'nanda',
                title: '南大校車',
                arrival: "末班車已過",
            });
        }

        return returnData;
    }, [tab, UphillBuses, DownhillBuses]);

    return <div className="flex flex-col px-4">
        <Tabs defaultValue="north_gate" value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-evenly mb-4">
                <TabsTrigger className="flex-1" value="north_gate">北校門口</TabsTrigger>
                <TabsTrigger className="flex-1" value="tsmc">台積館</TabsTrigger>
                <TabsTrigger className="flex-1" value="nanda">南大校區</TabsTrigger>
            </TabsList>
            <div className="flex flex-col px-2 divide-y divide-slate-100">
                {displayBuses.map((bus, index) => (
                    <BusListingItem key={index} {...bus} refTime={time} />
                ))}
            </div>
        </Tabs>
    </div>
}

export default BusPage;