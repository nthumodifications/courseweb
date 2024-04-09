'use client';
import { NextPage } from "next";
import TodaySchedule from "@/components/Today/TodaySchedule";
import { useQuery } from "@tanstack/react-query";
import {WeatherData} from '@/types/weather';
import { AlertDefinition } from "@/config/supabase";
import {EventData} from "@/types/calendar_event";


const TodayPage: NextPage = () => {

    const { data: weatherData, error: weatherError, isLoading: weatherLoading } = useQuery<WeatherData>({
        queryKey: ['weather'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/weather');
            const data = await res.json();
            return data;
        }
    });

    const { data: alerts = [], error: alertError, isError: alertLoading } = useQuery<AlertDefinition[]>({
        queryKey: ['alert'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/alert');
            const data = await res.json();
            return data;
        }
    });

    const {data: calendarData = [], error: calendarError, isLoading: calendarLoading } = useQuery<EventData[]>({
        queryKey: ['event'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/calendar');
            const data = await res.json();
            return data;
        }
    });

    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-[380px_auto] md:grid-rows-1">
            <TodaySchedule weather={weatherData} weatherLoading={weatherLoading} alerts={alerts} alertLoading={alertLoading} calendar={calendarData} calendarLoading={calendarLoading}/>
            <main className='overflow-auto'>
                {/* {children} */}
            </main>
        </div>
    )
}

export default TodayPage;