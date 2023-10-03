import { TimetableDim } from '@/types/timetable';
import {FC} from 'react';
import {CourseTimeslotData} from '@/types/courses';

const TimetableSlot: FC<{course: CourseTimeslotData, tableDim: TimetableDim}> = ({ course, tableDim}) => {
    return ( 
    <div 
        className={`absolute rounded-md shadow-lg transform translate-y-0.5`}
        style={{ 
            left: tableDim.header.width + course.dayOfWeek * tableDim.timetable.width, 
            top: tableDim.header.height + (course.startTime) * tableDim.timetable.height, 
            width: tableDim.timetable.width - 4, 
            height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
            backgroundColor: course.color
        }}
        >
        <div className='flex flex-col justify-center items-start text-left h-full text-black/70 p-1'>
            <span className='text-xs lg:text-base font-semibold'>{course.course.name_zh}</span>
            {/* {<span className='text-xs'>{course.course.name_en}</span>} */}
            <span className='text-[10px]'>{course.course.venue}</span>
            <span className='text-[10px]'>{course.course.raw_teacher_zh}</span>
            {/* <span className='text-xs'>{course.course.raw_teacher_en}</span> */}
        </div>
    </div>
    );
}

export default TimetableSlot;