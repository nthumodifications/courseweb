'use client';
import { getTimeOnDate } from "@/helpers/bus";
import useTime from "@/hooks/useTime";
import { cn } from "@/lib/utils";
import { addMinutes, formatDate, isSameMinute, subMinutes } from "date-fns";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

enum BusStationState {
    UNAVAILABLE,
    AT_STATION,
    LEFT,
}

const linesDict: {
    [key: string]: {
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
    'green_up' : {
        'stations_zh': ['北校門口', '綜二', '楓林小徑', '奕園停車場', '南門停車場', '台積館'],
        'stations_en': ['North Main Gate', 'General Building II', 'Maple Path', 'Yi Pavilion Parking Lot', 'South Gate Parking Lot', 'TSMC Building'],
        'timings': [0, 2, 1, 2, 1],
    },
    'green_down' : {
        'stations_zh': ['台積館', '人社院/生科院', '楓林小徑', '綜二', '北校門口'],
        'stations_en': ['TSMC Building', 'South Gate Parking Lot', 'Yi Pavilion Parking Lot', 'Maple Path', 'General Building II', 'North Main Gate'],
        'timings': [0, 2, 1, 2, 1],
    },
    'red_up' : {
        'stations_zh': ['北校門口', '綜二', '楓林小徑', '人社院/生科院', '台積館'],
        'stations_en': ['North Main Gate', 'General Building II', 'Maple Path', 'CHSS/CLS Building', 'TSMC Building'],
        'timings': [0, 2, 1, 2, 1],
    },
    'red_down' : {
        'stations_zh': ['台積館', '南門停車場', '奕園停車場', '楓林小徑', '綜二', '北校門口'],
        'stations_en': ['TSMC Building', 'South Gate Parking Lot', 'Yi Pavilion Parking Lot', 'Maple Path', 'General Building II', 'North Main Gate'],
        'timings': [0, 2, 1, 2, 1],
    },
    'nanda_up' : {
        'stations_zh': ['北校門口', '綜二', '人社院/生科院', '台積館', '南大校區'],
        'stations_en': ['Nanda Line', 'General Building II', 'CHSS/CLS Building', 'TSMC Building', 'Nanda Campus'],
        'timings': [0, 2, 1, 2, 10],
    },
    'nanda_down' : {
        'stations_zh': ['南大校區', '台積館', '人社院/生科院', '綜二', '北校門口'],
        'stations_en': ['Nanda Campus', 'TSMC Building', 'CHSS/CLS Building', 'General Building II', 'North Main Gate'],
        'timings': [10, 2, 1, 2, 0],
    }
}

const LineDisplayPage = () => {
    const { line } = useParams() as { line: string };
    const searchParams = useSearchParams();
    const start_time = searchParams.get('start_time');
    const time = useTime();
    if(!(line in linesDict)) return (<div>Invalid Line</div>);
    const lineData = linesDict[line] as typeof linesDict['green_up'];
    const displayText = useMemo<{
        state: BusStationState,
        station: string,
        time: string,
    }[]>(() => {
        const startDate = getTimeOnDate(time, start_time as string);
        return lineData.stations_zh.map((station, i) => {
            const stationDepTime = addMinutes(startDate, lineData.timings.slice(0, i).reduce((a, b) => a + b, 0));
            if(time < stationDepTime) return {state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm')};
            if(isSameMinute(time, stationDepTime)) return {state: BusStationState.AT_STATION, station, time: '即將進站'};
            if(time > stationDepTime) return {state: BusStationState.LEFT, station, time: formatDate(stationDepTime, 'HH:mm')};
            return {state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm')};
        });
    }, [time, start_time]);

    return <div className="w-full items-start inline-flex px-4">
    <div className="w-full p-2 flex-col justify-start inline-flex">
        {displayText.map((m, i) => <div key={m.station} className={cn("items-stretch gap-4 inline-flex")}>
            <div className="h-auto relative w-3">
                {i != 0 && (m.state > BusStationState.UNAVAILABLE ?
                    <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-nthu-400 z-10" />
                    :<div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />)}
                {m.state >= BusStationState.AT_STATION ? 
                    <div className="absolute top-[calc(50%-6px)] w-3 h-3 bg-nthu-500 rounded-full z-20" />
                    :<div className="absolute top-[calc(50%-6px)] w-3 h-3 bg-slate-200 rounded-full z-20" />}
                {i != (displayText.length - 1) && (m.state > BusStationState.AT_STATION ?
                    <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-nthu-400 z-10" />
                    :<div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />)}
            </div>
            <div className={cn("flex-1 py-4 justify-start items-center gap-2 flex border-b border-border", m.state > BusStationState.AT_STATION ? 'opacity-30' : '')}>
                <div className="text-slate-800 text-base font-bold">{m.station}</div>
                <div className={cn("flex-1 text-right text-base font-bold", m.state == BusStationState.AT_STATION ? 'text-nthu-500' : 'text-slate-500')}>{m.time}</div>
            </div>
        </div>)}
    </div>
</div>
}

export default LineDisplayPage;