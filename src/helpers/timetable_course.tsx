'use client';
import TimetableSlotHorizontal from "@/components/Timetable/TimetableSlotHorizontal"
import TimetableSlotVertical from "@/components/Timetable/TimetableSlotVertical"
import { CourseTimeslotDataWithFraction, TimetableDim } from "@/types/timetable"
import {TimetableItemDrawer} from '@/components/Timetable/TimetableItemDrawer';

export const renderTimetableSlot = (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical?: boolean) => {
    return <TimetableItemDrawer course={course.course}>
        {vertical ? 
            <TimetableSlotVertical
                course={course} 
                tableDim={tableDim} 
                fraction={course.fraction} 
                fractionIndex={course.fractionIndex} />
        :
            <TimetableSlotHorizontal 
                course={course} 
                tableDim={tableDim} 
                fraction={course.fraction} 
                fractionIndex={course.fractionIndex} />}
        </TimetableItemDrawer>
  }