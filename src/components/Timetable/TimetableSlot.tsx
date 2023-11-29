import { useSettings } from '@/hooks/contexts/settings';
import { MinimalCourse } from '@/types/courses';
import { CourseTimeslotData, TimetableDim } from '@/types/timetable';
import { useRouter } from 'next/navigation';
import { FC } from 'react';
import { VenueChip } from './VenueChip';
import {scheduleTimeSlots} from '@/const/timetable';

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
                left: tableDim.header.width + course.dayOfWeek * tableDim.timetable.width + (fractionIndex - 1) * (tableDim.timetable.width / fraction),
                top: tableDim.header.height + (course.startTime) * tableDim.timetable.height,
                width: (tableDim.timetable.width / fraction) - 4,
                height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
                backgroundColor: course.color
            }}
        >
            <div className='flex flex-col justify-start items-center h-full p-1 select-none' style={{ color: course.textColor }}>
                <div className='flex-1 w-full flex flex-col items-center'>
                {language == 'zh' ?
                    <span className='text-xs md:text-sm line-clamp-2 font-medium text-center'>{course.course.name_zh}</span> :
                    <span className='text-xs line-clamp-2 font-medium text-center'>{course.course.name_en}</span>
                }
                <span className='hidden md:inline text-xs line-clamp-2 font-medium'>{scheduleTimeSlots[course.startTime].start} - {scheduleTimeSlots[course.endTime].end}</span>
                </div>
                <div className='flex flex-row justify-end items-center space-x-1'>
                    <VenueChip venue={course.venue} color={course.textColor} textColor={course.color} />
                </div>
            </div>
        </div>
    );
}

export default TimetableSlot;