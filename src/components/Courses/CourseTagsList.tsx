'use client';
import { CourseDefinition } from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { getGECType } from '@/helpers/courses';
import { DetailedHTMLProps, FC, HTMLAttributes, PropsWithChildren } from 'react';
import { Users } from 'lucide-react';

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
const CourseTagList = ({ course }: { course: CourseDefinition }) => {
    const dict = useDictionary();
    return (
        <div className='flex flex-row flex-wrap gap-1 text-sm'>
            <HighlightItem>
                <span className="">
                    {course.capacity ?? '-'}
                    {(course.reserve ?? 0) > 0 && <>
                        {` 保 ${course.reserve}`}
                    </>}
                </span>

                <Users strokeWidth={2.5} className='w-5 h-5' />
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
                </HighlightItem> :
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
                <HighlightItem className='bg-pink-50 text-pink-900 dark:bg-pink-950 dark:text-pink-100'>
                    {course.ge_target} 通識
                </HighlightItem>}
            {getGECType(course.ge_type || "") &&
                <HighlightItem className='bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'>
                    核通 {getGECType(course.ge_type!)}
                </HighlightItem>}


        </div>
    )
}

export default CourseTagList;