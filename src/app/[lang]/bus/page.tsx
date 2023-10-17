'use client';

import { useSettings } from "@/hooks/contexts/settings";
import Link from "next/link";
import { stops } from "@/const/bus";

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
    
    return (
        <div className="py-4 flex flex-col">
            <h1 className="text-4xl font-semibold pl-4">校内公車</h1>
            <div className="grid grid-cols-2">
                <h2 className="text-4xl font-semibold pl-6 text-gray-600 py-6">上</h2>
                <h2 className="text-4xl font-semibold bg-gray-200 dark:bg-neutral-800 pr-6 text-end py-6">下</h2>
                {stops.map((stop, index) => (<>
                    <Link key={index} href={`/${language}/bus/stop/${stop.code}U`}>
                        <div className="flex flex-col pb-4 pl-6" key={index}>
                            <span className="text-lg font-bold">{stop.name_zh}</span>
                            <span className="text-xs">{stop.name_en}</span>
                        </div>
                    </Link>
                    <Link key={index} href={`/${language}/bus/stop/${stop.code}D`}>
                        <div className="flex flex-col pb-4 bg-gray-200 dark:bg-neutral-800 pr-6 items-end" key={index}>
                            <span className="text-lg font-bold">{stop.name_zh}</span>
                            <span className="text-xs">{stop.name_en}</span>
                        </div>
                    </Link>
                </>))}
                <h2 className="text-4xl font-semibold pl-6 text-gray-600 py-6"></h2>
                <h2 className="text-4xl font-semibold bg-gray-200 dark:bg-neutral-800 pr-6 text-end py-6"></h2>
            </div>
        </div>
    )
}

export default BusPage;