import { scheduleTimeSlots } from "@/const/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import { MinimalCourse } from '@/types/courses';
import { getBrightness } from "./colors";
import { adjustLuminance} from '@/helpers/colors';
import { timetableColors } from "../const/timetableColors";
import { hasTimes } from "./courses";

export const createTimetableFromCourses = (data: MinimalCourse[], theme = 'ashes') => {
    if(Object.keys(timetableColors).indexOf(theme) === -1) {
        theme = 'ashes';
    }
    const newTimetableData: CourseTimeslotData[] = [];
    data!.forEach(course => {
        //get unique days first
        if (!hasTimes(course)) {
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
                //get the color, mod the index by the length of the color array so that it loops
                const color = timetableColors[theme][data!.indexOf(course) % timetableColors[theme].length];

                //Determine the text color
                const brightness = getBrightness(color);
                //From the brightness, using the adjustBrightness function, create a complementary color that is legible
                const textColor = adjustLuminance(color, brightness > 186 ? 0.2 : 0.95);

                //push to scheduleData
                newTimetableData.push({
                    course: course,
                    venue: course.venues![index]!,
                    dayOfWeek: 'MTWRFS'.indexOf(day),
                    startTime: startTime,
                    endTime: endTime,
                    color: color,
                    textColor: textColor,
                });
            });
        });

    });
    return newTimetableData;
}
