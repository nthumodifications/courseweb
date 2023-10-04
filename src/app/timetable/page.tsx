'use client';;
import Timetable from "@/components/Timetable/Timetable";
import supabase from "@/config/supabase";
import { scheduleTimeSlots } from "@/const/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { CourseTimeslotData} from '@/types/courses';
import { Database } from "@/types/supabase";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import {CourseDefinition} from '@/config/supabase';
import { Button, ButtonGroup, IconButton, Input } from "@mui/joy";
import { Delete, Download, EyeOff, Share, Trash } from "react-feather";
import { useLocalStorage, useIsFirstRender } from "usehooks-ts";

const pastelColors = [
    "#ffffed", // lavender
    "#fff5ee", // seashell
    "#fff0f5", // snow
    "#f5f5f5", // white smoke
    "#f0fff0", // honeydew
    "#e6ffe6", // pale green
    "#d3ffd3", // light blue
    "#c0ffc0", // mint cream
    "#add8e6", // light blue
    "#98f5ff", // sky blue
  ];


const tsinghuarian = [
    '#845EC2',
    '#D65DB1',
    '#FF6F91',
    '#FF9671',
    '#FFC75F',
    '#A8BB5C',
    '#5CA46E',
    '#20887A',
    '#1C6873',
    '#2F4858'
]

const TimetablePage: NextPage = () => {
    const { courses, setCourses } = useSettings();
    const [localCourseCache, setLocalCourseCache] = useLocalStorage<CourseDefinition[]>("cached_courses", []);

    const [timetableData, setTimetableData] = useState<CourseTimeslotData[]>([]);
    const [allCourseData, setAllCourseData] = useState<CourseDefinition[]>([]);

    useEffect(() => {
        console.log('Loading from Cache')
        createTimetableFromCourses(localCourseCache);
    }, []);

    useEffect(() => {
        console.log('Loading from Server');
        (async () => {
            try {
                let { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courses);
                if(error) console.error(error);
                else {
                    createTimetableFromCourses(data!);
                    setLocalCourseCache(data!);
                }
            } catch(e) {
                console.error(e);
            }
        })();
    }, [courses.length])

    const createTimetableFromCourses = (data: CourseDefinition[]) => {
        console.log("your courses", data);
        const newTimetableData:CourseTimeslotData[] = [];
        setAllCourseData(data!);
        data!.forEach(course => {
            //get unique days first
            if(!course.raw_time) {
                return;
            };
            const timeslots = course.raw_time.match(/.{1,2}/g)?.map(day => ({ day: day[0], time: day[1] }));
            const days = timeslots!.map(time => time.day).filter((day, index, self) => self.indexOf(day) === index);
            days.forEach(day => {
                const times = timeslots!.filter(time => time.day == day).map(time => scheduleTimeSlots.map(m => m.time).indexOf(time.time));
                //get the start and end time
                const startTime = Math.min(...times);
                const endTime = Math.max(...times);
                //get the color
                const color = tsinghuarian[data!.indexOf(course)];
                //push to scheduleData
                newTimetableData.push({
                    course: course,
                    dayOfWeek: 'MTWRFS'.indexOf(day),
                    startTime: startTime,
                    endTime: endTime,
                    color: color
                });
            });
        });
        console.log("your timetable data", newTimetableData);
        setTimetableData(newTimetableData);
    }

    const deleteCourse = async (course: CourseDefinition) => {
        setCourses(courses.filter(c => c != course.raw_id));
    }

    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
            <Timetable timetableData={timetableData} />
            <div className="flex flex-col gap-4 px-4">
                <Input placeholder="Add course to Timetable" />
                {allCourseData.map((course, index) => (
                    <div key={index} className="flex flex-row gap-4 items-center">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tsinghuarian[index] }}></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-sm">{course.name_zh}</span>
                            <span className="text-xs">{course.name_en}</span>
                        </div>
                        <ButtonGroup>
                            <IconButton onClick={() => deleteCourse(course)}>
                                <Trash className="w-4 h-4"/>
                            </IconButton>
                            <IconButton>
                                <EyeOff className="w-4 h-4"/>
                            </IconButton>
                        </ButtonGroup>
                    </div>
                ))}
                <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    <Button variant="outlined" startDecorator={<Download className="w-4 h-4"/>}>Download</Button>
                    <Button variant="outlined" startDecorator={<Share className="w-4 h-4"/>}>Share/Sync</Button>
                </div>
            </div>
        </div>
    )
}

export default TimetablePage;