import { NextPage } from "next";
import {getWeatherData} from '@/lib/weather';
import TodaySchedule from "@/components/Today/TodaySchedule";
import {getAlerts} from '@/lib/alerts';

export const revalidate = 3600;

const TodayPage: NextPage = async () => {
    const weatherData = await getWeatherData();
    const alerts = await getAlerts();

    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-[380px_auto] md:grid-rows-1">
            <TodaySchedule weather={weatherData} alerts={alerts}/>
            <main className='overflow-auto'>
                {/* {children} */}
            </main>
        </div>
    )
}

export default TodayPage;