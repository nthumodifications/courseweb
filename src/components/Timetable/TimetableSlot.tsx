import { CourseData } from '@/types/courses';
import { TimetableDim } from '@/types/timetable';
import {FC} from 'react';

const TimetableSlot: FC<{course: CourseData, tableDim: TimetableDim}> = ({ course, tableDim}) => {
    return ( 
    <div 
        className={`absolute rounded-md shadow-lg transform translate-y-0.5 ${course.color}`}
        style={{ 
            left: tableDim.header.width + course.dayOfWeek * tableDim.timetable.width, 
            top: tableDim.header.height + (course.startTime) * tableDim.timetable.height, 
            width: tableDim.timetable.width - 4, 
            height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
        }}
        >
        <div className='flex flex-col justify-center items-center h-full text-black'>
            <span className='text-xs lg:text-base font-bold'>{course.titleEng}</span>
            {/* <span className='text-xs'>{course.course.english}</span> */}
            {/* {!hideTeacher && <span className='text-xs'>{course.teacher.map(teacher => teacher[lang]).join(', ')}</span>} */}
            {/* <span className='text-xs'>{course.room.building? `${course.room.building.code[lang]} ${data.course.room.code}`: data.course.room.code}</span> */}
        </div>
    </div>
    );
}

export default TimetableSlot;