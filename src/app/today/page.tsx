import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";
import {Input} from '@mui/joy';
import { format } from "date-fns";

const TodayPage: NextPage = () => {
    const getRangeOfDays = (start: Date, end: Date) => {
        const days = [];
        for(let i = start.getTime(); i <= end.getTime(); i += 86400000) {
            days.push(new Date(i));
        }
        return days;
    }
    //get a range of 5 days starting from today
    const days = getRangeOfDays(new Date(), new Date(Date.now() + 86400000 * 4));

    return (
        <div className="h-full grid grid-cols-[320px_auto] grid-rows-1">
            <div className="h-full w-full px-8 py-4">
                {days.map(day => (
                    <div className="flex flex-col gap-2 pb-8">
                        <div className="flex flex-row gap-2 justify-between border-b border-gray-400 pb-2">
                            <div className="flex flex-col flex-1">
                                {/* 6TH OCTOBER */}
                                <div className="text-sm font-semibold text-gray-400">{format(day, 'do MMMM')}</div>
                                {/* WEDNESDAY */}
                                <div className="text-xl font-semibold text-gray-600">{format(day, 'EEEE')}</div>
                            </div>
                        </div>
                        {"You have no classes"}
                    </div>
                ))}
            </div>
            <main className='overflow-auto'>
                {/* {children} */}
            </main>
        </div>
    )
}

export default TodayPage;