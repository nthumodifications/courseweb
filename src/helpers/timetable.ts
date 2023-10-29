import { CourseDefinition } from "@/config/supabase.types";
import { scheduleTimeSlots } from "@/const/timetable";
import { CourseTimeslotData } from "@/types/timetable";

export const timetableColors = {
    'pastelColors': [
        "#ffffed", // lavender
        "#fff5ee", // seashell
        "#fff0f5", // snow
        "#f5f5f5", // white smoke
        "#f0fff0", // honeydew
        "#e6ffe6", // pale green
        "#d3ffd3", // light blue
        "#c0ffc0", // mint cream
        "#add8e6", // light blue
        "#98f5ff", // sky blue
    ],
    'tsinghuarian': [
        '#845EC2',
        '#D65DB1',
        '#FF6F91',
        '#FF9671',
        '#FFC75F',
        '#A8BB5C',
        '#5CA46E',
        '#20887A',
        '#1C6873',
        '#2F4858'
    ]
}


export const createTimetableFromCourses = (data: CourseDefinition[]) => {
    const newTimetableData: CourseTimeslotData[] = [];
    data!.forEach(course => {
        //get unique days first
        if (!course.times) {
            return;
        };
        course.times.forEach((time_str, index) => {
            const timeslots = time_str.match(/.{1,2}/g)?.map(day => ({ day: day[0], time: day[1] }));
            const days = timeslots!.map(time => time.day).filter((day, index, self) => self.indexOf(day) === index);
            days.forEach(day => {
                const times = timeslots!.filter(time => time.day == day).map(time => scheduleTimeSlots.map(m => m.time).indexOf(time.time));
                //get the start and end time
                const startTime = Math.min(...times);
                const endTime = Math.max(...times);
                //get the color
                const color = timetableColors['tsinghuarian'][data!.indexOf(course)];
                //push to scheduleData
                newTimetableData.push({
                    course: course,
                    venue: course.venues![index]!,
                    dayOfWeek: 'MTWRFS'.indexOf(day),
                    startTime: startTime,
                    endTime: endTime,
                    color: color
                });
            });
        });
        
    });
    return newTimetableData;
}
