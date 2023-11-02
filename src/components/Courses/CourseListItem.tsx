import { CourseDefinition } from '@/config/supabase.types';
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

    return <div className="text-gray-600 dark:text-gray-400 px-4">
        <div className="grid grid-cols-1 lg:grid-rows-none lg:grid-cols-[auto_224px]">
            <div className='flex-1 space-y-4'>
                <div className="mb-3 space-y-1">
                    <Link className="font-semibold text-lg text-fuchsia-800 dark:text-fuchsia-500" href={'courses/'+course.raw_id}>{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</Link>
                    <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en} - <span className='w-max'>{(course.teacher_en ?? []).join(',')}</span></h3>
                </div>
                <div className="space-y-1 text-black">
                    <p className='text-sm'>{course.課程限制說明}</p>
                    <p className='text-sm'>{course.備註}</p>
                    <p className='text-sm'>{course.擋修說明}</p>
                    
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
            <div className='flex flex-col space-y-3'>
                <p>{course.credits} {dict.course.credits}</p>
                {course.venues? 
                    course.venues.map((vn, i) => <p className='text-blue-600 font-mono'>{vn} <span className='text-black'>{course.times![i]}</span></p>) : 
                    <p>No Venues</p>
                }
                {course.capacity && <div className="flex flex-row space-x-1 mb-2">
                    <Users className='w-5 h-5'/>
                    <span className="">{course.capacity}{course.reserve == 0 ? '' : ` / ${course.reserve}R`}</span>
                </div>}
                {isCourseSelected ?
                        <Button color="danger" variant="outlined" onClick={() => setCourses(courses => courses.filter(m => m != course.raw_id))}>
                            {dict.course.item.remove_from_semester}
                        </Button> :
                        <Button variant="outlined" onClick={() => setCourses(courses => [...courses, course.raw_id ?? ""])}>
                            {dict.course.item.add_to_semester}
                        </Button>}
            </div>
        </div>
    </div>
}

export default CourseListItem;