'use client';
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { Button } from "@/components/ui/button";
import useDictionary from "@/dictionaries/useDictionary";
import { getTimeOnDate } from "@/helpers/bus";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { cn } from "@/lib/utils";
import { addMinutes, formatDate, isSameMinute, subMinutes } from "date-fns";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

enum BusStationState {
    UNAVAILABLE,
    AT_STATION,
    LEFT,
}

const linesDict: {
    [key: string]: {
        Icon: React.FC,
        title_zh: string,
        title_en: string,
        stations_zh: string[],
        stations_en: string[],
        timings: number[],
    }
} = {
    //up
    // (紅線)北校門口 → 綜二館 → 楓林小徑 → 人社院/生科院 → 台積館
    // (綠線) 北校門口 → 綜二館 → 楓林小徑 → 奕園停車場 → 南門停車場 → 台積館"
    // (Red Line) North Main Gate → General Building II → Maple Path → CHSS/CLS Building → TSMC Building
    // (Green Line) North Main Gate → General Building II → Maple Path → Yi Pavilion Parking Lot → South Gate Parking Lot → TSMC Building"
    //down
    // (紅線) 台積館 → 南門停車場 → 奕園停車場 → 楓林小徑 → 綜二館 → 北校門口
    // (綠線) 台積館 → 人社院/生科院 → 楓林小徑 → 綜二館 → 北校門口",
    // (Red Line) TSMC Building → South Gate Parking Lot → Yi Pavilion Parking Lot → Maple Path → General Building II → North Main Gate
    // (Green Line) TSMC Building → CHSS/CLS Building → Maple Path → General Building II → North Main Gate"
    'green': {
        Icon: GreenLineIcon,
        'title_zh': "綠線",
        'title_en': "Green Line",
        'stations_zh': ['北校門口', '綜二', '楓林小徑', '奕園停車場', '南門停車場', '台積館', '人社院/生科院', '楓林小徑', '綜二', '北校門口'],
        'stations_en': ['North Main Gate', 'General Building II', 'Maple Path', 'Yi Pavilion Parking Lot', 'South Gate Parking Lot', 'TSMC Building', 'South Gate Parking Lot', 'Yi Pavilion Parking Lot', 'Maple Path', 'General Building II', 'North Main Gate'],
        'timings': [1, 2, 2, 1, 1, 2, 3, 2, 1],
    },
    'red': {
        Icon: RedLineIcon,
        title_zh: "紅線",
        title_en: "Red Line",
        'stations_zh': ['北校門口', '綜二', '楓林小徑', '人社院/生科院', '台積館', '南門停車場', '奕園停車場', '楓林小徑', '綜二', '北校門口'],
        'stations_en': ['North Main Gate', 'General Building II', 'Maple Path', 'CHSS/CLS Building', 'TSMC Building', 'South Gate Parking Lot', 'Yi Pavilion Parking Lot', 'Maple Path', 'General Building II', 'North Main Gate'],
        'timings': [1, 2, 3, 2, 1, 1, 2, 2, 1],
    },
    'nanda_up': {
        Icon: NandaLineIcon,
        title_zh: "南大校車 往南大校區",
        title_en: "Nanda Line To Nanda",
        'stations_zh': ['北校門口', '綜二', '人社院/生科院', '台積館', '南大校區'],
        'stations_en': ['Nanda Line', 'General Building II', 'CHSS/CLS Building', 'TSMC Building', 'Nanda Campus'],
        'timings': [1, 2, 2, 2, 10],
    },
    'nanda_down': {
        Icon: NandaLineIcon,
        title_zh: "南大校車 往校本部",
        title_en: "Nanda Line to Main Campus",
        'stations_zh': ['南大校區', '台積館', '人社院/生科院', '綜二', '北校門口'],
        'stations_en': ['Nanda Campus', 'TSMC Building', 'CHSS/CLS Building', 'General Building II', 'North Main Gate'],
        'timings': [10, 2, 2, 2, 1],
    }
}

const LineDisplayPage = () => {
    const { line } = useParams() as { line: string };
    const searchParams = useSearchParams();
    const _start_time = searchParams.get('start_time');
    const start_index = searchParams.get('start_index');
    const time = useTime();
    if (!(line in linesDict)) return (<div>Invalid Line</div>);
    const lineData = linesDict[line] as typeof linesDict['green_up'];

    // based on the start time at start_index, calculate the first station's time
    const startDate = subMinutes(getTimeOnDate(time, _start_time as string), lineData.timings.slice(0, parseInt(start_index as string)).reduce((a, b) => a + b, 0));

    const { language } = useSettings();
    const dict = useDictionary();
    const returnUrl = searchParams.get('return_url') ?? `/${language}/bus`
    const displayText = useMemo<{
        state: BusStationState,
        station: string,
        time: string,
    }[]>(() => {
        return (language == 'zh' ?lineData.stations_zh : lineData.stations_en).map((station, i) => {
            const stationDepTime = addMinutes(startDate, lineData.timings.slice(0, i).reduce((a, b) => a + b, 0));
            if (time < stationDepTime) return { state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm') };
            if (isSameMinute(time, stationDepTime)) return { state: BusStationState.AT_STATION, station, time: dict.bus.departing };
            if (time > stationDepTime) return { state: BusStationState.LEFT, station, time: formatDate(stationDepTime, 'HH:mm') };
            return { state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm') };
        });
    }, [time, startDate]);

    return <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center px-2 gap-4">
            <Button variant={'ghost'} asChild>
                <Link href={returnUrl}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                </Link>
            </Button>
            <div className="flex flex-row gap-4 items-center">
                <lineData.Icon />
                <h3 className="text-slate-800 dark:text-neutral-200 font-bold">{language == 'zh' ? lineData.title_zh: lineData.title_en}</h3>
            </div>

        </div>
        <div className="w-full items-start inline-flex px-4">
            <div className="w-full p-2 flex-col justify-start inline-flex">
                {displayText.map((m, i) => <div key={i} className={cn("items-stretch gap-4 inline-flex")}>
                    <div className="h-auto relative w-3">
                        {i != 0 && (m.state > BusStationState.UNAVAILABLE ?
                            <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-nthu-400 z-10" />
                            : <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />)}
                        {m.state >= BusStationState.AT_STATION ?
                            <div className="absolute top-[calc(50%-6px)] w-3 h-3 bg-nthu-500 rounded-full z-20" />
                            : <div className="absolute top-[calc(50%-6px)] w-3 h-3 bg-slate-200 rounded-full z-20" />}
                        {i != (displayText.length - 1) && (m.state > BusStationState.AT_STATION ?
                            <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-nthu-400 z-10" />
                            : <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />)}
                    </div>
                    <div className={cn("flex-1 py-4 justify-start items-center gap-2 flex border-b border-border", m.state > BusStationState.AT_STATION ? 'opacity-30' : '')}>
                        <div className="text-slate-800 dark:text-slate-200 text-base font-bold">{m.station}</div>
                        <div className={cn("flex-1 text-right text-base font-bold", m.state == BusStationState.AT_STATION ? 'text-nthu-500' : 'text-slate-600 dark:text-slate-400')}>{m.time}</div>
                    </div>
                </div>)}
            </div>
        </div>
    </div>
}

export default LineDisplayPage;