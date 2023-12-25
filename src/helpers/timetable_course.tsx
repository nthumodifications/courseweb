'use client';
import TimetableSlotHorizontal from "@/components/Timetable/TimetableSlotHorizontal"
import TimetableSlotVertical from "@/components/Timetable/TimetableSlotVertical"
import { CourseTimeslotDataWithFraction, TimetableDim } from "@/types/timetable"
import Link from "next/link"

export const renderTimetableSlot = (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical?: boolean) => {
    return <Link href={`/courses/${course.course.raw_id}`}>
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
        </Link>
  }