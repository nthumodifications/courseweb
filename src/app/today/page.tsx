'use server';
import { NextPage } from "next";
import {getWeatherData} from '@/lib/weather';
import TodaySchedule from "@/components/Today/TodaySchedule";


const TodayPage: NextPage = async () => {
    const weatherData = await getWeatherData();

    return (
        <div className="h-full grid grid-cols-1 grid-rows-2 md:grid-cols-[380px_auto] md:grid-rows-1">
            <TodaySchedule weather={weatherData} />
            <main className='overflow-auto'>
                {/* {children} */}
            </main>
        </div>
    )
}

export default TodayPage;