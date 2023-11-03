import { scheduleTimeSlots } from "@/const/timetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { getHours, getMinutes, parse } from "date-fns";
import * as ics from 'ics';
import { NextResponse } from "next/server";
import { zonedTimeToUtc } from 'date-fns-tz'
import getSupabaseServer from "@/config/supabase_server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    
    const supabase = await getSupabaseServer();
    const courses_ids = searchParams.get('semester_1121')?.split(',')!;
    const theme = searchParams.get('theme') || 'tsinghuarian';

    try {
        let { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courses_ids);
        if (error) throw error;
        else {
            const timetableData = createTimetableFromCourses(data!, theme);
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
                    description: `${course.course.name_zh!}\n${course.course.name_en!}\n${course.course.raw_teacher_zh!}\n${course.course.raw_teacher_en!}}\n${course.course.raw_id}`,
                    location: course.venue,
                    start: [2023, 9, 10+course.dayOfWeek, getHours(start), getMinutes(start)],
                    end: [2023, 9, 10+course.dayOfWeek, getHours(end), getMinutes(end)],
                    calName: 'NTHUMods',
                    recurrenceRule: `FREQ=WEEKLY;BYDAY=${day};INTERVAL=1;UNTIL=20240112T000000Z`
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