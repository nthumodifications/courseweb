'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";
import { Button, ButtonGroup, IconButton, Input } from "@mui/joy";
import { Download, EyeOff, Search, Share, Trash } from "react-feather";
import { timetableColors } from '@/helpers/timetable';
import useUserTimetable from "@/hooks/useUserTimetable";
import { useRouter } from "next/navigation";

const TimetablePage: NextPage = () => {
    const { courses, setCourses } = useSettings();

    const { timetableData, allCourseData, deleteCourse } = useUserTimetable();

    const router = useRouter();
    
    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
            <Timetable timetableData={timetableData} />
            <div className="flex flex-col gap-4 px-4">
                <Input placeholder="Add course to Timetable" />
                {allCourseData.map((course, index) => (
                    <div key={index} className="flex flex-row gap-4 items-center">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors['tsinghuarian'][index] }}></div>
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
                {allCourseData.length == 0 && (
                    <div className="flex flex-col items-center space-y-4">
                        <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                        <div className="flex flex-row gap-2">
                            {/* <Button variant="plain" startDecorator={<UploadCloud className="w-4 h-4"/>}>Import from File</Button> */}
                            <Button variant="soft" startDecorator={<Search className="w-4 h-4"/>} onClick={() => router.push('/courses')}>All Courses</Button>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    <Button variant="outlined" startDecorator={<Download className="w-4 h-4"/>}>Download</Button>
                    <Button variant="outlined" startDecorator={<Share className="w-4 h-4"/>}>Share/Sync</Button>
                </div>
            </div>
        </div>
    )
}

export default TimetablePage;