import { CourseDefinition } from '@/config/supabase';
import { useSettings } from '@/hooks/contexts/settings';
import { useModal } from '@/hooks/contexts/useModal';
import { MinimalCourse } from '@/types/courses';
import { CourseTimeslotData, TimetableDim } from '@/types/timetable';
import { ModalClose, ModalDialog } from '@mui/joy';
import { useRouter } from 'next/navigation';
import {FC} from 'react';

type TimetableSlotProps = {
    course: CourseTimeslotData, 
    tableDim: TimetableDim, 
    fraction?: number,
    fractionIndex?: number
}

const TimetableSlot: FC<TimetableSlotProps> = ({ course, tableDim, fraction = 1, fractionIndex = 1 }) => {
    const router = useRouter();
    const { language } = useSettings();

    const handleShowCourseDetail = (course: MinimalCourse) => () => {
        router.push(`/${language}/courses/${course.raw_id}`);
    }
    return ( 
    <div 
        className={`absolute rounded-md shadow-lg transform translate-y-0.5 cursor-pointer`}
        onClick={handleShowCourseDetail(course.course)}
        style={{ 
            left: tableDim.header.width + course.dayOfWeek * tableDim.timetable.width + (fractionIndex - 1) * (tableDim.timetable.width/fraction), 
            top: tableDim.header.height + (course.startTime) * tableDim.timetable.height, 
            width: (tableDim.timetable.width/fraction) - 4, 
            height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
            backgroundColor: course.color
        }}
        >
        <div className='flex flex-col justify-start items-start text-left h-full p-1 select-none' style={{ color: course.textColor }}>
            {language == 'zh' ? 
            <span className='text-xs line-clamp-2 font-bold'>{course.course.name_zh}</span>:
            <span className='text-xs line-clamp-2 font-bold'>{course.course.name_en}</span>
            }
            <span className='text-[10px]'>{course.venue}</span>
            {course.course.teacher_zh && <span className='text-[10px]'>{course.course.teacher_zh?.join(',')}</span>}
        </div>
    </div>
    );
}

export default TimetableSlot;