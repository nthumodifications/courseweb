import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { CourseTimeslotData } from "@/types/timetable";
import {
  semesterInfo,
  parseSlotTime,
  scheduleTimeSlots,
} from "@courseweb/shared";
import { CalendarEvent } from "./calendar.types";
import { Language } from "@/types/settings";
import { TAIPEI_TIME_ZONE } from "@/helpers/dates";

const taipeiDateTime = (date: Date, time: string) =>
  fromZonedTime(
    `${format(date, "yyyy-MM-dd")}T${time}:00.000`,
    TAIPEI_TIME_ZONE,
  );

export const timetableToCalendarEvent = (
  timetable: CourseTimeslotData[],
  language: Language,
): CalendarEvent[] => {
  return timetable
    .filter(
      (t) => scheduleTimeSlots[t.startTime] && scheduleTimeSlots[t.endTime],
    )
    .map((t) => {
      const semester = semesterInfo.find((s) => s.id == t.course.semester)!;
      const startTime = parseSlotTime(scheduleTimeSlots[t.startTime].start);
      const endTime = parseSlotTime(scheduleTimeSlots[t.endTime].end);
      const classDate = addDays(semester.begins, t.dayOfWeek);
      const startDate = taipeiDateTime(
        classDate,
        `${String(startTime[0]).padStart(2, "0")}:${String(startTime[1]).padStart(2, "0")}`,
      );
      const endDate = taipeiDateTime(
        classDate,
        `${String(endTime[0]).padStart(2, "0")}:${String(endTime[1]).padStart(2, "0")}`,
      );
      const semesterEnd = taipeiDateTime(semester.ends, "00:00");

      const title = language == "en" ? t.course.name_en : t.course.name_zh;

      return {
        id:
          t.course.raw_id +
          "-" +
          t.dayOfWeek +
          "-" +
          t.startTime +
          "-" +
          t.endTime,
        title: title,
        location: t.venue,
        allDay: false,
        start: startDate,
        end: endDate,
        repeat: {
          type: "weekly",
          interval: 1,
          mode: "date",
          value: semesterEnd.getTime(),
        },
        color: t.color,
        tag: "course",
        courseId: t.course.raw_id,
      };
    });
};
