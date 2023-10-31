import { useSettings } from "./contexts/settings";
import { useState, useEffect } from "react";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import useSWR from "swr";
import useSupabaseClient from '@/config/supabase_client';
import { CourseDefinition } from "@/config/supabase.types";

const useUserTimetable = (loadCourse = true) => {
    const { courses, timetableTheme, setCourses } = useSettings();
    const supabase = useSupabaseClient();
    
    const { data: allCourseData = [], error, isLoading } = useSWR(['courses', courses], async ([table, courseCodes]) => {
        const { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courseCodes);
        if(error) throw error;
        if(!data) throw new Error('No data');
        return data;
    });

    const [timetableData, setTimetableData] = useState<CourseTimeslotData[]>([]);

    useEffect(() => {
        if(!loadCourse) return;
        if(error) {
            console.error(error);
            return;
        }
        if(isLoading) {
            console.log('loading')
            return;
        }
        setTimetableData(createTimetableFromCourses(allCourseData!, timetableTheme));
    }, [allCourseData, isLoading, error, timetableTheme]);

    const deleteCourse = async (course: CourseDefinition) => {
        setCourses(courses.filter(c => c != course.raw_id));
    }

    const addCourse = async (course: CourseDefinition) => {
        setCourses([...courses, course.raw_id!]);
    }

    return { timetableData, allCourseData, deleteCourse, addCourse, isLoading, error };
}

export default useUserTimetable;

