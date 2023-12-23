import { CourseDefinition } from '@/config/supabase';
import { useSettings } from '@/hooks/contexts/settings';
import { useModal } from '@/hooks/contexts/useModal';
import { MinimalCourse } from '@/types/courses';
import { CourseTimeslotData, TimetableDim } from '@/types/timetable';
import { ModalClose, ModalDialog } from '@mui/joy';
import { useRouter } from 'next/navigation';
import {FC} from 'react';
import { VenueChip } from './VenueChip';
import { scheduleTimeSlots } from '@/const/timetable';

type TimetableSlotProps = {
    course: CourseTimeslotData, 
    tableDim: TimetableDim, 
    fraction?: number,
    fractionIndex?: number,
    onClick?: () => void
}

const TimetableSlotVertical: FC<TimetableSlotProps> = ({ course, tableDim, fraction = 1, fractionIndex = 1, onClick }) => {
    const { language } = useSettings();

    return ( 
    <div 
        className={`absolute rounded-md shadow-lg transform translate-y-0.5 cursor-pointer`}
        onClick={onClick}
        style={{ 
            left: tableDim.header.width + course.startTime * tableDim.timetable.width , 
            top: tableDim.header.height + (course.dayOfWeek) * tableDim.timetable.height + (fractionIndex - 1) * (tableDim.timetable.height/fraction), 
            width: tableDim.timetable.width * (course.endTime - course.startTime + 1) - 4, 
            height: tableDim.timetable.height/fraction,
            backgroundColor: course.color,
            color: course.textColor
        }}
        >
        <div className='flex flex-col justify-start items-start text-left h-full p-1 select-none'>
            <div className='flex-1 flex flex-col justify-start items-start text-left w-full'>
                {language == 'zh' ? 
                    <span className='text-xs md:text-sm line-clamp-1 font-medium'>{course.course.name_zh}</span>:
                    <span className='text-xs line-clamp-1 font-medium'>{course.course.name_en}</span>
                }
                <span className='text-xs line-clamp-1'>{scheduleTimeSlots[course.startTime].start} - {scheduleTimeSlots[course.endTime].end}</span>

            </div>
            <VenueChip venue={course.venue} color={course.textColor} textColor={course.color} />
        </div>
    </div>
    );
}

export default TimetableSlotVertical;