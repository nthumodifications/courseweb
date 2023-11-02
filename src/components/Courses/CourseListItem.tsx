import { CourseDefinition } from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Chip, Tooltip } from '@mui/joy';
import Link from 'next/link';
import { FC, PropsWithChildren, useMemo } from 'react';
import { Minus, Plus, Users } from 'react-feather';
import {getGECType} from '@/helpers/courses';

const HighlightItem: FC<PropsWithChildren<{}>> = ({ children }) => {
    return <div className='flex flex-row items-center justify-center min-w-[65px] space-x-2 px-2 py-2 rounded-md bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'>
        {children}
    </div>
}

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    const { courses, setCourses } = useSettings();
    const dict = useDictionary();
    const isCourseSelected = useMemo(() => courses.includes(course.raw_id ?? ""), [courses, course]);

    return <div className="text-gray-600 dark:text-gray-400 px-4">
        <div className="grid grid-cols-1 lg:grid-rows-none lg:grid-cols-[auto_224px]">
            <div className='flex-1 space-y-4'>
                <div className="mb-3 space-y-1">
                    <Link className="font-semibold text-lg text-[#AF7BE4]" href={'courses/'+course.raw_id}>{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</Link>
                    <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en} - <span className='w-max'>{(course.teacher_en ?? []).join(',')}</span></h3>
                </div>
                <div className="space-y-1 text-black dark:text-neutral-200">
                    <p className='text-sm'>{course.課程限制說明}</p>
                    <p className='text-sm'>{course.備註}</p>
                    {course.擋修說明 && 
                    <Tooltip 
                        placement='bottom-start'
                        title={<p dangerouslySetInnerHTML={{ __html: course.擋修說明}}></p>}
                    >
                        <p className='text-sm underline text-orange-600'>有儅修</p>
                    </Tooltip>}
                </div>
                <div className="space-x-2 justify-end mt-4">
                        {course.tags.includes('X-Class') && 
                        <Chip
                            color="danger"
                            disabled={false}
                            size="md"
                            variant="outlined"
                        >X-Class</Chip>}
                        {course.language == '英' ? 
                        <Chip
                            color="primary"
                            disabled={false}
                            size="md"
                            variant="outlined"
                        >
                            English
                        </Chip> :
                        <Chip
                            color="success"
                            disabled={false}
                            size="md"
                            variant="outlined"
                        >
                            國語
                        </Chip>}
                        {(course.ge_target?.trim() || "").length > 0 && 
                        <Chip
                            color="primary"
                            disabled={false}
                            size="md"
                            variant="outlined"
                        >{course.ge_target} 通識課</Chip>}
                        {getGECType(course.ge_type || "") && <Chip
                            color="warning"
                            disabled={false}
                            size="md"
                            variant="outlined"
                        >
                            核通 {getGECType(course.ge_type!)}
                        </Chip>}
                    </div>
            </div>
            <div className='flex flex-col space-y-3'>
                <p>{course.semester} 學期</p>
                {course.venues? 
                    course.venues.map((vn, i) => <p className='text-blue-600 dark:text-blue-400'>{vn} <span className='text-black dark:text-white'>{course.times![i]}</span></p>) : 
                    <p>No Venues</p>
                }
                <div className='flex flex-row space-x-1 text-sm'>
                    <HighlightItem>
                        <span className="">
                            {course.capacity ?? '-'} 
                            {(course.reserve ?? 0) > 0 && <>
                                <br/>
                                {`保 ${course.reserve}`}
                            </>}
                        </span>
                        
                        <Users className='w-5 h-5'/>
                    </HighlightItem>
                    <HighlightItem>
                        <span className="">{course.credits}</span>
                        <span className="">{dict.course.credits}</span>
                    </HighlightItem>
                    {course.tags.includes('16周') && <HighlightItem>
                        <span className="">16 週</span>
                    </HighlightItem>}
                    {course.tags.includes('18周') && <HighlightItem>
                        <span className="">18 週</span>
                    </HighlightItem>}
                </div>
                {isCourseSelected ?
                        <Button 
                            color="danger" 
                            variant="outlined" 
                            onClick={() => setCourses(courses => courses.filter(m => m != course.raw_id))}
                            startDecorator={<Minus/>}
                        >
                            {dict.course.item.remove_from_semester}
                        </Button> :
                        <Button 
                            variant="outlined" 
                            onClick={() => setCourses(courses => [...courses, course.raw_id ?? ""])}
                            startDecorator={<Plus/>}
                        >
                            {dict.course.item.add_to_semester}
                        </Button>}
            </div>
        </div>
    </div>
}

export default CourseListItem;