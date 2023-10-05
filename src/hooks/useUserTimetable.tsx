import { useLocalStorage } from "usehooks-ts";
import { useSettings } from "./contexts/settings";
import { useState, useEffect } from "react";
import { CourseTimeslotData } from "@/types/courses";
import supabase, { CourseDefinition } from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";

const useUserTimetable = (loadCourse = true) => {
    const { courses, setCourses } = useSettings();
    const [localCourseCache, setLocalCourseCache] = useLocalStorage<CourseDefinition[]>("cached_courses", []);

    const [timetableData, setTimetableData] = useState<CourseTimeslotData[]>([]);
    const [allCourseData, setAllCourseData] = useState<CourseDefinition[]>([]);

    useEffect(() => {
        if(!loadCourse) return;
        console.log('Loading from Cache')
        setAllCourseData(localCourseCache!);
        setTimetableData(createTimetableFromCourses(localCourseCache));
    }, []);

    useEffect(() => {
        if(!loadCourse) return;
        console.log('Loading from Server');
        (async () => {
            try {
                let { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courses);
                if(error) console.error(error);
                else {
                    setAllCourseData(data!);
                    setTimetableData(createTimetableFromCourses(data!));
                    setLocalCourseCache(data!);
                }
            } catch(e) {
                console.error(e);
            }
        })();
    }, [courses.length])

    const deleteCourse = async (course: CourseDefinition) => {
        setCourses(courses.filter(c => c != course.raw_id));
    }

    const addCourse = async (course: CourseDefinition) => {
        setCourses([...courses, course.raw_id!]);
    }

    return { timetableData, allCourseData, deleteCourse, addCourse };
}

export default useUserTimetable;

