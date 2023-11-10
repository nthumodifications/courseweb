import { useSettings } from "./contexts/settings";
import { useState, useEffect } from "react";
import supabase, { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import useSWR from "swr";
import {MinimalCourse, RawCourseID} from '@/types/courses';

const useUserTimetable = (loadCourse = true) => {
    const { courses, timetableTheme, setCourses } = useSettings();
    
    const { data: allCourseData = [], error, isLoading } = useSWR(['courses', courses], async ([table, courseCodes]) => {
        const { data = [], error } = await supabase.rpc('search_courses_with_syllabus', { keyword: "" }).in('raw_id', courseCodes);
        if(error) throw error;
        if(!data) throw new Error('No data');
        return data as unknown as CourseSyllabusView[];
    });
    console.log(allCourseData)
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

    const deleteCourse = async (courseID: RawCourseID) => {
        setCourses(courses.filter(c => c != courseID));
    }

    const addCourse = async (courseID: RawCourseID) => {
        setCourses([...courses, courseID!]);
    }

    return { timetableData, allCourseData, deleteCourse, addCourse, isLoading, error };
}

export default useUserTimetable;

