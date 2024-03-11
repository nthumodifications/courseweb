'use client';;
import { NextPage } from "next";
import { useQuery } from "@tanstack/react-query";
import {WeatherData} from '@/types/weather';
import { AlertDefinition } from "@/config/supabase";
import Calendar from "./Calendar";

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

    return (
        <div className="p-4 w-full h-full">
            <div className="flex flex-col gap-6">
                <div className="h-72 flex-col justify-start items-start gap-2 inline-flex">
                    <div className="self-stretch text-slate-900 text-lg font-semibold font-['Inter'] leading-7">即將到來的行程</div>
                    <div className="self-stretch h-64 p-4 bg-slate-50 rounded-lg flex-col justify-start items-start gap-6 flex">
                        <div className="self-stretch justify-start items-start gap-6 inline-flex">
                        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
                            <div className="self-stretch h-10 justify-start items-center gap-2 inline-flex">
                            <div className="grow shrink basis-0 text-slate-900 text-lg font-semibold font-['Inter'] leading-7">考試</div>
                            <div className="px-4 py-2 bg-white bg-opacity-0 rounded-md justify-center items-center gap-2.5 flex">
                                <div className="text-slate-900 text-sm font-medium font-['Inter'] leading-normal">查看全部</div>
                            </div>
                            </div>
                            <div className="self-stretch h-24 px-2 pt-2 pb-6 bg-green-100 rounded flex-col justify-start items-start gap-2 flex">
                            <div className="self-stretch text-slate-800 text-sm font-medium font-['Inter'] leading-none">國際經濟學期中</div>
                            <div className="self-stretch justify-start items-start gap-1 inline-flex">
                                <div className="text-slate-500 text-xs font-normal font-['Inter'] leading-none">Apr 5</div>
                                <div className="grow shrink basis-0 text-slate-500 text-xs font-normal font-['Inter'] leading-none">10:00 - 12:00</div>
                            </div>
                            <div className="self-stretch text-slate-500 text-xs font-normal font-['Inter'] leading-none">Ch1 - Ch3</div>
                            </div>
                            <div className="self-stretch h-16 px-2 pt-2 pb-6 bg-green-100 rounded flex-col justify-start items-start gap-2 flex">
                            <div className="self-stretch text-slate-800 text-sm font-medium font-['Inter'] leading-none">期貨期末報告</div>
                            <div className="self-stretch justify-start items-start gap-1 inline-flex">
                                <div className="text-slate-500 text-xs font-normal font-['Inter'] leading-none">Jun 2</div>
                                <div className="grow shrink basis-0 text-slate-500 text-xs font-normal font-['Inter'] leading-none">9:00 - 12:00</div>
                            </div>
                            </div>
                        </div>
                        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
                            <div className="self-stretch h-10 text-slate-900 text-lg font-semibold font-['Inter'] leading-7">會議</div>
                            <div className="self-stretch h-28 px-2 pt-2 pb-6 bg-purple-100 rounded flex-col justify-start items-start gap-2 flex">
                            <div className="self-stretch text-slate-800 text-sm font-medium font-['Inter'] leading-none">NTHUMODS meeting</div>
                            <div className="self-stretch justify-start items-start gap-1 inline-flex">
                                <div className="text-slate-500 text-xs font-normal font-['Inter'] leading-none">Mar 2</div>
                                <div className="grow shrink basis-0 text-slate-500 text-xs font-normal font-['Inter'] leading-none">9:00 - 10:00</div>
                            </div>
                            <div className="self-stretch text-slate-500 text-xs font-normal font-['Inter'] leading-none">https://meet.google.com/biu-juok-hzf</div>
                            </div>
                        </div>
                        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
                            <div className="self-stretch h-10 text-slate-900 text-lg font-semibold font-['Inter'] leading-7">校園活動</div>
                            <div className="self-stretch h-24 px-2 pt-2 pb-6 bg-teal-100 rounded flex-col justify-start items-start gap-2 flex">
                            <div className="self-stretch text-slate-800 text-sm font-medium font-['Inter'] leading-none">梅竹草地音樂會</div>
                            <div className="self-stretch justify-start items-start gap-1 inline-flex">
                                <div className="text-slate-500 text-xs font-normal font-['Inter'] leading-none">Mar 4</div>
                                <div className="grow shrink basis-0 text-slate-500 text-xs font-normal font-['Inter'] leading-none">10:00 - 12:00</div>
                            </div>
                            <div className="self-stretch text-slate-500 text-xs font-normal font-['Inter'] leading-none">圖書館前大草皮</div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                <Calendar/>
            </div>
        </div>
            
    )
}

export default TodayPage;