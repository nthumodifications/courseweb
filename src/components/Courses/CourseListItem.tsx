import { CourseDefinition } from '@/config/supabase.types';
import useDictionary from '@/dictionaries/useDictionary';
import { useSettings } from '@/hooks/contexts/settings';
import { Button, Chip, Tooltip } from '@mui/joy';
import Link from 'next/link';
import { DetailedHTMLProps, FC, HTMLAttributes, PropsWithChildren, useMemo } from 'react';
import { Minus, Plus, Users } from 'react-feather';
import {getGECType} from '@/helpers/courses';

const HighlightItem: FC<PropsWithChildren<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>>> = ({ 
    children,  
    className = "",
    ...props
}) => {
    return <div 
            className={`flex flex-row items-center justify-center min-w-[65px] space-x-2 px-2 py-2 select-none rounded-md bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100 ${className}`}
            {...props}
        >
        {children}
    </div>
}

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    const { courses, setCourses } = useSettings();
    const dict = useDictionary();
    const isCourseSelected = useMemo(() => courses.includes(course.raw_id ?? ""), [courses, course]);
    return <div className="text-gray-600 dark:text-gray-400 px-4 border-b border-gray-200 dark:border-neutral-800 pb-4">
        <div className="grid grid-cols-1 lg:grid-rows-none lg:grid-cols-[auto_250px] gap-4">
            <div className='flex-1 space-y-4'>
                <div className="mb-3 space-y-1">
                    <Link className="font-semibold text-lg text-[#AF7BE4]" href={'courses/'+course.raw_id}>{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</Link>
                    <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en} - <span className='w-max'>{(course.teacher_en ?? []).join(',')}</span></h3>
                </div>
                <div className="space-y-1 text-black dark:text-neutral-200">
                    <p className='text-sm whitespace-pre-line'>{course.課程限制說明}</p>
                    <p className='text-sm whitespace-pre-line'>{course.備註}</p>
                    {course.擋修說明 && 
                    <Tooltip 
                        placement='bottom-start'
                        title={<p dangerouslySetInnerHTML={{ __html: course.擋修說明}}></p>}
                    >
                        <p className='text-sm underline text-orange-600 select-none'>有儅修</p>
                    </Tooltip>}
                </div>
            </div>
            <div className='flex flex-col space-y-3'>
                <p className='text-black dark:text-white text-sm'>{course.semester} 學期</p>
                <div className='space-y-1'>
                {course.venues? 
                    course.venues.map((vn, i) => <p className='text-blue-600 dark:text-blue-400 text-sm'>{vn} <span className='text-black dark:text-white'>{course.times![i]}</span></p>) : 
                    <p>No Venues</p>
                }
                </div>
                <div className='flex flex-row flex-wrap gap-1 text-sm'>
                    <HighlightItem>
                        <span className="">
                            {course.capacity ?? '-'} 
                            {(course.reserve ?? 0) > 0 && <>
                                {` 保 ${course.reserve}`}
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
                    {course.language == '英' ? 
                        <HighlightItem className='bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100'>
                            English
                        </HighlightItem>:
                        <HighlightItem className='bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'>
                            國語
                        </HighlightItem>
                    }
                    {/* bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100 */}
                    {course.tags.includes('X-Class') && 
                        <HighlightItem className='bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'>
                            X-Class
                        </HighlightItem>}
                    {(course.ge_target?.trim() || "").length > 0 && 
                        <HighlightItem  className='bg-pink-50 text-pink-900 dark:bg-pink-950 dark:text-pink-100'>
                            {course.ge_target} 通識
                        </HighlightItem>}
                    {getGECType(course.ge_type || "") && 
                        <HighlightItem className='bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'>
                            核通 {getGECType(course.ge_type!)}
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