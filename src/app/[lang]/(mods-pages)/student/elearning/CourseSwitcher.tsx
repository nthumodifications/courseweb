'use client';
import { IconButton } from '@mui/joy';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ElearningCourse } from "@/types/elearning";


const CourseSwitcher = ({ selectedCourse, setSelectedCourse, courses }: { selectedCourse: string, setSelectedCourse: (course: string) => void, courses: ElearningCourse[] }) => {
    const courseObj = courses.find(s => s.courseId == selectedCourse)!;

    const hasPrev = courses.indexOf(courseObj) > 0;
    const hasNext = courses.indexOf(courseObj) < courses.length - 1;

    const goPrev = () => {
        if (!hasPrev) return;
        const prev = courses[courses.indexOf(courseObj) - 1];
        setSelectedCourse(prev.courseId);
    }
    const goNext = () => {
        if (!hasNext) return;
        const next = courses[courses.indexOf(courseObj) + 1];
        setSelectedCourse(next.courseId);
    }

    return <div className="flex flex-row items-center justify-center text-center gap-4 px-4 py-2 w-full">
        <IconButton color="primary" disabled={!hasPrev} onClick={goPrev}>
            <ChevronLeft />
        </IconButton>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-1/3">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="every">所有課程All Courses</SelectItem>
                <SelectSeparator />
                {
                    courses.map((course) => <SelectItem value={course.courseId}>{course.courseName}</SelectItem>)
                }
            </SelectContent>
        </Select>
        <IconButton color="primary" disabled={!hasNext} onClick={goNext}>
            <ChevronRight />
        </IconButton>
    </div>
}

export default CourseSwitcher;