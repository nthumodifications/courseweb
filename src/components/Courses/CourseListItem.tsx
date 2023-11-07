'use client';;
import {CourseDefinition, CourseSyllabusView} from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { Tooltip } from '@mui/joy';
import { FC } from 'react';
import Link from 'next/link';
import CourseTagList from './CourseTagsList';
import SelectCourseButton from './SelectCourseButton';

const CourseListItem: FC<{ course: CourseSyllabusView }> = ({ course }) => {
    const dict = useDictionary();

    return <div className="text-gray-600 dark:text-gray-400 px-4 border-b border-gray-200 dark:border-neutral-800 pb-4">
        <div className="grid grid-cols-1 lg:grid-rows-none lg:grid-cols-[auto_250px] gap-4">
            <div className='flex-1 space-y-4'>
                <div className="mb-3 space-y-1">
                    <Link className="font-semibold text-lg text-[#AF7BE4]" href={'courses/'+course.raw_id}>{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</Link>
                    <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en} - <span className='w-max'>{(course.teacher_en ?? []).join(',')}</span></h3>
                </div>
                <div className="space-y-2 ">
                    <p className='text-sm whitespace-pre-line line-clamp-4 text-black dark:text-neutral-200'>{course.brief}</p>
                    <p className='text-sm whitespace-pre-line text-gray-400 dark:text-neutral-600'>{course.restrictions}</p>
                    <p className='text-sm whitespace-pre-line text-gray-400 dark:text-neutral-600'>{course.note}</p>
                    {course.prerequisites && 
                    <Tooltip 
                        placement='bottom-start'
                        title={<p dangerouslySetInnerHTML={{ __html: course.prerequisites}}></p>}
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
                <CourseTagList course={course as unknown as CourseDefinition}/>
                <SelectCourseButton courseId={course.raw_id as string}/>
            </div>
        </div>
    </div>
}

export default CourseListItem;