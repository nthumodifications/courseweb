'use client';
import { useSettings } from "./contexts/settings";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import supabase, { CourseSyllabusView } from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import useSWR from "swr";
import { MinimalCourse, RawCourseID } from '@/types/courses';
import { useLocalStorage } from 'usehooks-ts';
import { lastSemester, semesterInfo, currentSemester } from "@/const/semester";
import { getSemesterFromID } from '@/helpers/courses';
import { event } from "@/lib/gtag";

type CourseLocalStorage = { [sem: string]: RawCourseID[] };

const userTimetableContext = createContext<ReturnType<typeof useUserTimetableProvider>>({
    timetableData: [],
    displayCourseData: [],
    semesterCourseData: [],
    semesterCourses: [],
    courses: {},
    setCourses: () => { },
    clearCourses: () => { },
    deleteCourse: () => { },
    addCourse: () => { },
    isCourseSelected: () => false,
    isLoading: true,
    error: undefined,
    semester: lastSemester.id,
    setSemester: () => { }
});

const useUserTimetableProvider = (loadCourse = true) => {
    const { timetableTheme } = useSettings();
    const [courses, setCourses] = useLocalStorage<CourseLocalStorage>("courses", {});
    const [semester, setSemester] = useState<string>(lastSemester.id);
    const [timetableData, setTimetableData] = useState<CourseTimeslotData[]>([]);


    const { data: displayCourseData = [], error, isLoading } = useSWR(['courses', courses[semester]], async ([table, courseCodes]) => {
        if(!courseCodes) return [];
        const { data = [], error } = await supabase.rpc('search_courses_with_syllabus', { keyword: "" }).in('raw_id', courseCodes);
        if (error) throw error;
        if (!data) throw new Error('No data');
        return data as unknown as CourseSyllabusView[];
    }, {
        keepPreviousData: true,
    });

    const { data: semesterCourseData = [], error: semesterError, isLoading: semesterLoading } = useSWR(['courses', currentSemester ? courses[currentSemester.id] : null], async ([table, courseCodes]) => {
        if(!courseCodes) return [];
        const { data = [], error } = await supabase.rpc('search_courses_with_syllabus', { keyword: "" }).in('raw_id', courseCodes);
        if (error) throw error;
        if (!data) throw new Error('No data');
        return data as unknown as CourseSyllabusView[];
    }, {
        keepPreviousData: true,
    });

    //migration from old localStorage key "semester_1121"
    useEffect(() => {
        //check if the old localStorage key "semester_1121" exists
        if (typeof window == "undefined") return;
        const oldCourses = window.localStorage.getItem("semester_1121");
        if (!oldCourses) return;

        //migrate old data to new data format
        const oldCoursesArray = JSON.parse(oldCourses) as RawCourseID[];
        oldCoursesArray.forEach(addCourse);

        setCourses(courses => {
            const newCourses = { ...courses };
            delete newCourses['11210'];
            return newCourses;
        });

        //remove old data
        window.localStorage.removeItem("semester_1121");
    }, []);

    useEffect(() => {
        if (!loadCourse) return;
        if (semesterError) {
            console.error(error);
            return;
        }
        if (semesterLoading) {
            console.log('loading')
            return;
        }
        setTimetableData(createTimetableFromCourses(semesterCourseData! as MinimalCourse[], timetableTheme));
    }, [semesterCourseData, semesterLoading, semesterError, timetableTheme]);

    //handlers for courses
    const addCourse = (courseID: string) => {
        setCourses(courses => {
            //get first 5 characters of courseID
            const semester = getSemesterFromID(courseID);
            if (!semester) throw new Error("Invalid courseID");
            const oldSemesterCourses = courses[semester] ?? [];

            //check if courseID already exists
            if (oldSemesterCourses.includes(courseID)) return courses;

            return {
                ...courses,
                [semester]: [...oldSemesterCourses, courseID]
            }
        });
        event({
            action: "add_course",
            category: "timetable",
            label: courseID,
        })
    }

    const deleteCourse = (courseID: string) => {
        setCourses(courses => {
            //get first 5 characters of courseID
            const semester = getSemesterFromID(courseID);
            if (!semester) throw new Error("Invalid courseID");
            const oldSemesterCourses = courses[semester] ?? [];

            //check if courseID already exists
            if (!oldSemesterCourses.includes(courseID)) return courses;

            return {
                ...courses,
                [semester]: oldSemesterCourses.filter(c => c != courseID)
            }
        });
        event({
            action: "delete_course",
            category: "timetable",
            label: courseID,
        })
    }

    const isCourseSelected = useCallback((courseID: string) => {
        const semester = getSemesterFromID(courseID);
        if (!semester) throw new Error("Invalid courseID");
        const oldSemesterCourses = courses[semester] ?? [];

        //check if courseID already exists
        return oldSemesterCourses.includes(courseID);
    }, [courses]);

    const semesterCourses = courses[semester] ?? [];

    const clearCourses = () => {
        setCourses({});
    }


    return {
        timetableData, 
        displayCourseData, 
        semesterCourseData,
        semester, 
        setSemester, 
        semesterCourses, 
        setCourses,
        addCourse, 
        deleteCourse, 
        clearCourses, 
        isCourseSelected, 
        isLoading, 
        error, 
        courses
    };
}

const useUserTimetable = () => useContext(userTimetableContext);

export const UserTimetableProvider = ({ children }: { children: React.ReactNode }) => {
    const value = useUserTimetableProvider();
    return <userTimetableContext.Provider value={value}>{children}</userTimetableContext.Provider>
}

export default useUserTimetable;

