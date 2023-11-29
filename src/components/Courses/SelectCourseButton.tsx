'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings"
import useUserTimetable from "@/hooks/useUserTimetable";
import { RawCourseID, Semester } from "@/types/courses";
import { Button } from "@mui/joy";
import { useMemo } from "react";
import { Minus, Plus } from "react-feather";

const SelectCourseButton = ({ courseId }: { courseId: RawCourseID }) => {
    const { isCourseSelected, addCourse, deleteCourse } = useUserTimetable();
    const dict = useDictionary();

    if(isCourseSelected(courseId)) return <Button 
            color="danger" 
            variant="outlined" 
            onClick={() => deleteCourse(courseId)}
            startDecorator={<Minus/>}
        >
            {dict.course.item.remove_from_semester}
        </Button> 
    else return <Button 
            variant="outlined" 
            onClick={() => addCourse(courseId)}
            startDecorator={<Plus/>}
        >
            {dict.course.item.add_to_semester}
        </Button>  
}

export default SelectCourseButton;