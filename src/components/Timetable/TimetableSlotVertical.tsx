import { useSettings } from '@/hooks/contexts/settings';
import { CourseTimeslotData, TimetableDim } from '@/types/timetable';
import { FC, HTMLAttributes } from 'react';
import { VenueChip } from './VenueChip';
import {scheduleTimeSlots} from '@/const/timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { cn } from '@/lib/utils';

type TimetableSlotProps = {
    course: CourseTimeslotData,
    tableDim: TimetableDim,
    fraction?: number,
    fractionIndex?: number
} & HTMLAttributes<HTMLDivElement>;

const TimetableSlotVertical: FC<TimetableSlotProps> = ({ course, tableDim, fraction = 1, fractionIndex = 1, ...props }) => {
    const { language } = useSettings();
    const { preferences } = useUserTimetable();

    const displayLang =  preferences.language == 'app' ? language : preferences.language;

    const flexAlign = preferences.align == 'left' ? 'items-start' : preferences.align == 'center' ? 'items-center' : 'items-end';
    const textAlign = preferences.align == 'left' ? 'text-left' : preferences.align == 'center' ? 'text-center' : 'text-right';

    return (
        <div
            className={`absolute rounded-md transform translate-y-0.5`}
            style={{
                left: tableDim.header.width + course.dayOfWeek * tableDim.timetable.width + (fractionIndex - 1) * (tableDim.timetable.width / fraction),
                top: tableDim.header.height + (course.startTime) * tableDim.timetable.height,
                width: (tableDim.timetable.width / fraction) - 4,
                height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
                backgroundColor: course.color
            }}
            {...props}
        >
            <div className={cn('flex flex-col justify-start h-full p-1 select-none', flexAlign)} style={{ color: course.textColor }}>
                <div className={cn('flex-1 w-full flex flex-col overflow-hidden', flexAlign, textAlign)}>
                {preferences.display.code && <span className='text-xs font-medium' id="time_slot">{course.course.department+course.course.course}</span>}
                {preferences.display.title && (displayLang == 'zh' ?
                    <span className={cn('text-xs md:text-sm font-medium', textAlign)}>{course.course.name_zh}</span> :
                    <span className={cn('text-xs font-medium', textAlign)}>{course.course.name_en}</span>
                )}
                {preferences.display.time && <span className='text-xs' id="time_slot">{scheduleTimeSlots[course.startTime].start} - {scheduleTimeSlots[course.endTime].end}</span>}
                </div>
                {preferences.display.venue && <div className='flex flex-row justify-end items-center space-x-1'>
                    <VenueChip venue={course.venue} color={course.textColor} textColor={course.color} />
                </div>}
            </div>
        </div>
    );
}

export default TimetableSlotVertical;