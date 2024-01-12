'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings"
import useUserTimetable from "@/hooks/useUserTimetable";
import { RawCourseID, Semester } from "@/types/courses";
import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "../ui/button";

const SelectCourseButton = ({ courseId }: { courseId: RawCourseID }) => {
    const { isCourseSelected, addCourse, deleteCourse } = useUserTimetable();
    const dict = useDictionary();

    if(isCourseSelected(courseId)) return <Button 
            variant={'destructive'}
            onClick={() => deleteCourse(courseId)}
        >
            <Minus/> {dict.course.item.remove_from_semester}
        </Button> 
    else return <Button 
            variant={'outline'}
            onClick={() => addCourse(courseId)}
        >
            <Plus/> {dict.course.item.add_to_semester}
        </Button>  
}

export default SelectCourseButton;