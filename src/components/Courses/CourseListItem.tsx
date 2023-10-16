import { CourseDefinition } from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Chip } from '@mui/joy';
import Link from 'next/link';
import { FC, useMemo } from 'react';
import { Users } from 'react-feather';

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    const { courses, setCourses } = useSettings();
    const dict = useDictionary();
    const isCourseSelected = useMemo(() => courses.includes(course.raw_id ?? ""), [courses, course]);

    return <div className="text-gray-600 px-4">
        <div className="grid grid-cols-1 lg:grid-rows-none lg:grid-cols-[auto_224px]">
            <div className='flex-1'>
                <div className="mb-3">
                    <Link className="font-semibold text-lg text-fuchsia-800" href={'courses/'+course.raw_id}>{course.department} {course.course}-{course.class} {course.name_zh} - {course.raw_teacher_zh}</Link>
                    <h3 className="text-base text-gray-800 mt-0 break-words">{course.name_en} - <span className='w-max'>{course.raw_teacher_en}</span></h3>
                </div>
                <div className="space-y-1">
                    <p>{course.venues?.join(', ') || "No Venue"} • {course.credits} {dict.course.credits}</p>
                    <p>{course.課程限制說明}</p>
                    {isCourseSelected ?
                        <Button color="danger" variant="outlined" onClick={() => setCourses(courses => courses.filter(m => m != course.raw_id))}>
                            {dict.course.item.remove_from_semester}
                        </Button> :
                        <Button variant="outlined" onClick={() => setCourses(courses => [...courses, course.raw_id ?? ""])}>
                            {dict.course.item.add_to_semester}
                        </Button>}
                </div>
            </div>
            <div className='flex flex-col'>
                {course.capacity && <div className="flex flex-row space-x-1 mb-2">
                    <Users />
                    <span className="">{course.capacity}{course.reserve == 0 ? '' : ` / ${course.reserve}R`}</span>
                </div>}
                <div>
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
                    <div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default CourseListItem;