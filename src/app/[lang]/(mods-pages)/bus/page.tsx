'use client';;
import { useSettings } from "@/hooks/contexts/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FC, HTMLProps, useMemo, useState } from "react";
import useTime from "@/hooks/useTime";
import { useQuery } from "@tanstack/react-query";
import { getBusesSchedules } from "./page.actions";
import { PropsOf } from "@emotion/react";
import { addMinutes, format, set } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const RedLineIcon = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="30" rx="15" fill="#EF4444" />
        <path d="M11.0114 21V9.36364H15.6023C16.4811 9.36364 17.2311 9.52083 17.8523 9.83523C18.4773 10.1458 18.9527 10.5871 19.2784 11.1591C19.608 11.7273 19.7727 12.3958 19.7727 13.1648C19.7727 13.9375 19.6061 14.6023 19.2727 15.1591C18.9394 15.7121 18.4564 16.1364 17.8239 16.4318C17.1951 16.7273 16.4337 16.875 15.5398 16.875H12.4659V14.8977H15.142C15.6117 14.8977 16.0019 14.8333 16.3125 14.7045C16.6231 14.5758 16.8542 14.3826 17.0057 14.125C17.161 13.8674 17.2386 13.5473 17.2386 13.1648C17.2386 12.7784 17.161 12.4527 17.0057 12.1875C16.8542 11.9223 16.6212 11.7216 16.3068 11.5852C15.9962 11.4451 15.6042 11.375 15.1307 11.375H13.4716V21H11.0114ZM17.2955 15.7045L20.1875 21H17.4716L14.642 15.7045H17.2955Z" fill="white" />
    </svg>
)

const GreenLineIcon = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="30" rx="15" fill="#10B981" />
        <path d="M18.0554 13.125C17.9759 12.8485 17.8641 12.6042 17.7202 12.392C17.5762 12.1761 17.4001 11.9943 17.1918 11.8466C16.9872 11.6951 16.7524 11.5795 16.4872 11.5C16.2259 11.4205 15.9361 11.3807 15.6179 11.3807C15.0232 11.3807 14.5005 11.5284 14.0497 11.8239C13.6027 12.1193 13.2543 12.5492 13.0043 13.1136C12.7543 13.6742 12.6293 14.3598 12.6293 15.1705C12.6293 15.9811 12.7524 16.6705 12.9986 17.2386C13.2448 17.8068 13.5933 18.2405 14.044 18.5398C14.4948 18.8352 15.027 18.983 15.6406 18.983C16.1974 18.983 16.6728 18.8845 17.0668 18.6875C17.4645 18.4867 17.7675 18.2045 17.9759 17.8409C18.188 17.4773 18.294 17.0473 18.294 16.5511L18.794 16.625H15.794V14.7727H20.6634V16.2386C20.6634 17.2614 20.4474 18.1402 20.0156 18.875C19.5838 19.6061 18.9891 20.1705 18.2315 20.5682C17.474 20.9621 16.6065 21.1591 15.6293 21.1591C14.5384 21.1591 13.58 20.9186 12.7543 20.4375C11.9285 19.9527 11.2846 19.2652 10.8224 18.375C10.3641 17.4811 10.1349 16.4205 10.1349 15.1932C10.1349 14.25 10.2713 13.4091 10.544 12.6705C10.8205 11.928 11.2069 11.2992 11.7031 10.7841C12.1993 10.2689 12.777 9.87689 13.4361 9.60795C14.0952 9.33901 14.8092 9.20455 15.5781 9.20455C16.2372 9.20455 16.8509 9.30114 17.419 9.49432C17.9872 9.68371 18.491 9.95265 18.9304 10.3011C19.3736 10.6496 19.7353 11.0644 20.0156 11.5455C20.2959 12.0227 20.4759 12.5492 20.5554 13.125H18.0554Z" fill="white" />
    </svg>
)

const NandaLineIcon = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="30" rx="15" fill="#8B5CF6"/>
        <path d="M19.9787 9.36364V21H17.8537L12.7912 13.6761H12.706V21H10.2457V9.36364H12.4048L17.4276 16.6818H17.5298V9.36364H19.9787Z" fill="white"/>
    </svg>

)

const TLDLineIcon = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="30" rx="15" fill="#F97316" />
        <path d="M10.3807 11.392V9.36364H19.9375V11.392H16.375V21H13.9432V11.392H10.3807Z" fill="white" />
    </svg>
)

type BusListingItemProps = { refTime: Date, Icon: FC<HTMLProps<SVGElement>>, title: string, destination?: string, notes?: string[], arrival: string }
const BusListingItem = ({ refTime, Icon, title, destination, notes = [], arrival }: BusListingItemProps) => {
    const displayTime = useMemo(() => {
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

    return <div className="flex flex-row py-4 items-center gap-4">
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
        queryKey: ['buses'],
        queryFn: () => getBusesSchedules('all', 'all', 'up'),
    });

    const { data: DownhillBuses = [], error: error2 } = useQuery({
        queryKey: ['buses'],
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
            <TabsList className="w-full justify-evenly">
                <TabsTrigger className="flex-1" value="north_gate">北校門口</TabsTrigger>
                <TabsTrigger className="flex-1" value="tsmc">台積館</TabsTrigger>
                <TabsTrigger className="flex-1" value="nanda">南大校區</TabsTrigger>
            </TabsList>
            <div className="flex flex-col px-2">
                {displayBuses.map((bus, index) => (
                    <BusListingItem key={index} {...bus} refTime={time} />
                ))}
            </div>
        </Tabs>
    </div>
}

export default BusPage;