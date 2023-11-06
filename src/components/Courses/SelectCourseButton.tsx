'use client';
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings"
import { RawCourseID } from "@/types/courses";
import { Button } from "@mui/joy";
import { useMemo } from "react";
import { Minus, Plus } from "react-feather";

const SelectCourseButton = ({ courseId }: { courseId: RawCourseID }) => {
    const { courses, setCourses } = useSettings();
    const dict = useDictionary();

    const isCourseSelected = useMemo(() => courses.includes(courseId), [courses, courseId]);

    if(isCourseSelected) return <Button 
            color="danger" 
            variant="outlined" 
            onClick={() => setCourses(courses => courses.filter(m => m != courseId))}
            startDecorator={<Minus/>}
        >
            {dict.course.item.remove_from_semester}
        </Button> 
    else return <Button 
            variant="outlined" 
            onClick={() => setCourses(courses => [...courses, courseId])}
            startDecorator={<Plus/>}
        >
            {dict.course.item.add_to_semester}
        </Button>  
}

export default SelectCourseButton;