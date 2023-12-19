import supabase from "@/config/supabase";
import { scheduleTimeSlots } from "@/const/timetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { differenceInMinutes, formatISO, getHours, getMinutes, parse } from "date-fns";
import * as ics from 'ics';
import { NextResponse } from "next/server";
import { zonedTimeToUtc } from 'date-fns-tz'
import { MinimalCourse } from "@/types/courses";
import { semesterInfo } from "@/const/semester";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester');
    const semesterObj = semesterInfo.find(sem => sem.id == semester);
    const courses_ids = searchParams.get('semester_'+semester)?.split(',')!;
    const theme = searchParams.get('theme') || 'pastelColors';

    if (!semester || !semesterObj || !courses_ids) return NextResponse.redirect('https://nthumods.com', { status: 500 });


    //server runs on UTC, convert time to GMT+8 (Asia/Taipei)
    const semStart = zonedTimeToUtc(semesterObj.begins, 'Asia/Taipei');
    const semEnd = zonedTimeToUtc(semesterObj.ends, 'Asia/Taipei');

    try {
        let { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courses_ids);
        if (error) throw error;
        else {
            const timetableData = createTimetableFromCourses(data! as MinimalCourse[], theme);
            const icss = ics.createEvents(timetableData.map(course => {
                const start = zonedTimeToUtc(parse(
                    scheduleTimeSlots[course.startTime]!.start,
                    'HH:mm',
                    new Date(),
                ), 'Asia/Taipei');
                const end = zonedTimeToUtc(parse(
                    scheduleTimeSlots[course.startTime]!.end,
                    'HH:mm',
                    new Date()
                ), 'Asia/Taipei');
                const day = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][course.dayOfWeek];

                return {
                    title: course.course.name_zh!,
                    description: `${course.course.name_zh!}\n${course.course.name_en!}}\n${course.course.raw_id}`,
                    location: course.venue,
                    start: [semStart.getFullYear(), semStart.getMonth(), semStart.getDate()+course.dayOfWeek, getHours(start), getMinutes(start)],
                    end: [semStart.getFullYear(), semStart.getMonth(), semStart.getDate()+course.dayOfWeek, getHours(end), getMinutes(end)],
                    calName: 'NTHUMods',
                    recurrenceRule: `FREQ=WEEKLY;BYDAY=${day};INTERVAL=1;UNTIL=${formatISO(semEnd, { representation: 'date' })}`
                }
            }))
            if(icss.error) throw icss.error;
            return new Response(icss.value!, { status: 200, headers: { 'Content-Type': 'text/calendar' } })
        }
    } catch (e) {
        console.error(e);
        return NextResponse.redirect('https://nthumods.com', { status: 500 });
    }
}