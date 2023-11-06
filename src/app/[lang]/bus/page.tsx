'use client';

import { useSettings } from "@/hooks/contexts/settings";
import Link from "next/link";
import { stops } from "@/const/bus";
import { Alert } from "@mui/joy";
import BusDelayAlert from "./BusDelayAlert";

const BusPage = () => {
//北校門口	綜二館	楓林小徑	奕園停車場	南門停車場	台積館 人社院/生科館	楓林小徑	綜二館	北校門口
// 北校門口
// North Gate
// 綜二館
// Gen II Building
// 楓林小徑
// Maple Path
// 人社院/生科館
// CHSS/CLS Building
// 南門停車場
// South Gate Parking Lot
// 奕園停車場
// Yi Pav. Parking Lot
// 台積館
// TSMC Building
    const { language } = useSettings();

    //regex to match {any text}{U | D}
    //U: going up
    //D: going down
    // regex is: [UD]{1}$
    
    return (
        <div className="py-4 flex flex-col">
            <h1 className="text-4xl font-semibold pl-4">校内公車</h1>
            <BusDelayAlert/>
            <div className="grid grid-cols-2">
                <h2 className="text-4xl font-semibold pl-6 text-gray-600 py-6">上</h2>
                <h2 className="text-4xl font-semibold bg-gray-200 dark:bg-neutral-800 pr-6 text-end py-6">下</h2>
                {stops.slice(0,-1).map((stop, index) => (<>
                    <Link key={index*2} href={`/${language}/bus/stop/${stop.code}U`}>
                        <div className="flex flex-col pb-4 pl-6" key={index}>
                            <span className="text-lg font-bold">{stop.name_zh}</span>
                            <span className="text-xs">{stop.name_en}</span>
                        </div>
                    </Link>
                    <Link key={index*2+1} href={`/${language}/bus/stop/${stop.code}D`}>
                        <div className="flex flex-col pb-4 bg-gray-200 dark:bg-neutral-800 pr-6 items-end" key={index}>
                            <span className="text-lg font-bold">{stop.name_zh}</span>
                            <span className="text-xs">{stop.name_en}</span>
                        </div>
                    </Link> 
                </>))}
                <Link href={`/${language}/bus/stop/A8`}>
                    <div className="flex flex-col pb-4 pl-6">
                        <span className="text-lg font-bold">南大校區</span>
                        <span className="text-xs">Nanda Campus</span>
                    </div>
                </Link>
                <h2 className="text-4xl font-semibold bg-gray-200 dark:bg-neutral-800 pr-6 text-end py-6"></h2>
            </div>
            <div className="p-4">
                <Alert variant="outlined" color="warning">
                    公車時間非及時跟新，因此尖峰時間可能會有誤差。
                    Bus Times are Scheduled and may not be accurate during peak hours.
                </Alert>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600">*資訊版本為 校園公車時刻表1121016-1130113,  南大校區區間車時刻表1121106-1130114. 如有差異請按<a href="mailto:chewtzihwee@gmail.com?subject=公車資訊錯誤" className="hover:underline" target="_blank">這裏</a></p>
        </div>
    )
}

export default BusPage;