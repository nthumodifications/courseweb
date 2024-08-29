import { addDays, set } from "date-fns";
import { CourseTimeslotData } from "@/types/timetable";
import { semesterInfo } from "@/const/semester";
import { parseSlotTime, scheduleTimeSlots } from "@/const/timetable";
import { CalendarEvent } from "./calendar.types";

export const timetableToCalendarEvent = (
  timetable: CourseTimeslotData[],
): CalendarEvent[] => {
  return timetable.map((t) => {
    const semester = semesterInfo.find((s) => s.id == t.course.semester)!;
    const startTime = parseSlotTime(scheduleTimeSlots[t.startTime].start);
    const endTime = parseSlotTime(scheduleTimeSlots[t.endTime].end);
    const startDate = set(addDays(semester.begins, t.dayOfWeek), {
      hours: startTime[0],
      minutes: startTime[1],
    });
    const endDate = set(addDays(semester.begins, t.dayOfWeek), {
      hours: endTime[0],
      minutes: endTime[1],
    });

    return {
      id:
        t.course.raw_id +
        "-" +
        t.dayOfWeek +
        "-" +
        t.startTime +
        "-" +
        t.endTime,
      title: t.course.name_zh,
      location: t.venue,
      allDay: false,
      start: startDate,
      end: endDate,
      repeat: {
        type: "weekly",
        interval: 1,
        mode: "date",
        value: semester.ends.getTime(),
      },
      color: t.color,
      tag: "course",
    };
  });
};
