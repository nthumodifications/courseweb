'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import supabase from "@/config/supabase";
import useSWR from "swr";
import { createTimetableFromCourses, timetableColors } from "@/helpers/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { MinimalCourse } from "@/types/courses";

const ViewTimetablePage: NextPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseCodes = searchParams.get('semester_1121')?.split(',');
    const { timetableTheme } = useSettings();

    if(!courseCodes) router.back();
    
    const { data: courses, error, isLoading } = useSWR(['courses', courseCodes!], async ([table, courseCodes]) => {
        const { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courseCodes);
        if(error) throw error;
        if(!data) throw new Error('No data');
        return data;
    })

    const timetableData = courses? createTimetableFromCourses(courses as MinimalCourse[], timetableTheme) : [];
      
    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
            <Timetable timetableData={timetableData} />
            <div className="flex flex-col gap-4 px-4">
            {courses && courses.map((course, index) => (
                <div key={index} className="flex flex-row gap-4 items-center">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors[timetableTheme][index] }}></div>
                    <div className="flex flex-col flex-1">
                        <span className="text-sm">{course.name_zh}</span>
                        <span className="text-xs">{course.name_en}</span>
                        <div className="mt-1">
                            {course.venues?.map((venue, index) => {
                                const time = course.times![index];
                                return <div key={index} className="flex flex-row items-center space-x-2 font-mono text-gray-400">
                                    <span className="text-xs">{venue}</span>
                                    <span className="text-xs">{time}</span>
                                </div>
                            }) || <span className="text-gray-400 text-xs">No Venue</span>}
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>
    )
}

export default ViewTimetablePage;