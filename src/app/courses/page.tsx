'use client';
import supabase, { CourseDefinition } from "@/config/supabase";
import { useSettings } from "@/hooks/contexts/settings";
import { Database } from "@/types/supabase";
import { Chip } from "@mui/joy";
import { NextPage } from "next";

import { useEffect, useState, FC } from "react";

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    return <div className="space-y-1 text-gray-600">
        <h1 className="font-semibold text-xl text-blue-700">{course.course_id} {course.name_zh}</h1>
        <h3>{course.name_en}</h3>
        <p>Computer Science • {course.credits} Credits</p>
        {course.language == 'en' ? <Chip
            color="primary"
            disabled={false}
            onClick={function(){}}
            size="md"
            variant="outlined"
        >English Instruction</Chip>:
        <Chip
            color="success"
            disabled={false}
            onClick={function(){}}
            size="md"
            variant="outlined"
        >Chinese Instruction</Chip>}
        <p>{course.teacher_zh} {course.teacher_en}</p>
        <p>
            {course.venue}
        </p>

    </div>
}

const CoursePage: NextPage = () => {
    // const { language } = useSettings();

    const [courses, setCourses] = useState<CourseDefinition[]>([]);

    useEffect(() => {
        (async () => {
            let { data: courses, error } = await supabase
                .from('courses')
                .select('*')
                .limit(300)
            console.log('courses',courses)
            if(error) console.log(error);
            else setCourses(courses!);
        })()
    },[])


    return (
        <div className="flex flex-col w-full">
            {courses.map((course, index) => (
                <CourseListItem key={index} course={course}/>
            ))}
        </div>
    )
}

export default CoursePage;