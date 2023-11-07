import { useSettings } from "./contexts/settings";
import { useState, useEffect } from "react";
import supabase, { CourseDefinition } from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import useSWR from "swr";
import {MinimalCourse} from '@/types/courses';

const useUserTimetable = (loadCourse = true) => {
    const { courses, timetableTheme, setCourses } = useSettings();
    
    const { data: allCourseData = [], error, isLoading } = useSWR(['courses', courses], async ([table, courseCodes]) => {
        const { data = [], error } = await supabase.from('courses_with_syllabus').select("*").in('raw_id', courseCodes);
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
        setTimetableData(createTimetableFromCourses(allCourseData! as MinimalCourse[], timetableTheme));
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

