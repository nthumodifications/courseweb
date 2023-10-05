import {CourseDefinition} from '@/config/supabase';
import {useSettings} from '@/hooks/contexts/settings';
import {Button, Chip} from '@mui/joy';
import {FC, useMemo} from 'react';
import {Users} from 'react-feather';

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    const { courses, setCourses } = useSettings();

    const isCourseSelected = useMemo(() => courses.includes(course.raw_id ?? ""), [courses, course]);

    return <div className="text-gray-600 px-4">
        <div className="flex flex-row justify-between">
            <div className="mb-3">
                <h1 className="font-semibold text-lg text-fuchsia-800">{course.department} {course.course}-{course.class} {course.name_zh} - {course.raw_teacher_zh}</h1>
                <h3 className="text-base text-gray-800 mt-0">{course.name_en} - {course.raw_teacher_en}</h3>
            </div>
            {course.capacity && <div className="flex flex-row space-x-1 mb-2">
                <Users />
                <span className="">{course.capacity}{course.reserve == 0 ? '': ` / ${course.reserve}R`}</span>
            </div>}
        </div>
        <div className="flex flex-row justify-between">
            <div className="space-y-1">
                <p>{course.venue || "No Venue"} • {course.credits} Credits</p>
                <p>{course.課程限制說明}</p>
                {isCourseSelected ?
                <Button color="danger" variant="outlined" onClick={() => setCourses(courses => courses.filter(m => m != course.raw_id))}>
                    Remove from this semester
                </Button>:
                <Button variant="outlined" onClick={() => setCourses(courses => [...courses, course.raw_id ?? ""])}>
                    Add to this semester
                </Button>}
            </div>
            <div className="space-x-2 justify-end">
                {course.備註?.includes('X-Class') && <Chip
                    color="danger"
                    disabled={false}
                    size="md"
                    variant="outlined"
                >X-Class</Chip>}
                {course.language == '英' ? <Chip
                    color="primary"
                    disabled={false}
                    size="md"
                    variant="outlined"
                >English</Chip> :
                    <Chip
                        color="success"
                        disabled={false}
                        size="md"
                        variant="outlined"
                    >國語</Chip>}
            </div>
        </div>
    </div>
}

export default CourseListItem;