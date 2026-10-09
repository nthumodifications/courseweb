import { endOfTaipeiDay, fromTaipeiDateKey } from "@/helpers/dates";
import {
  parseCourseSelectionPeriod,
  type AcademicCalendarEvent,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";
import type { EventData } from "@/types/calendar_event";
import type { CalendarEventInternal } from "./calendar.types";

export const toAcademicCalendarEvents = (
  events: EventData[],
  color: string,
  getSelectionTitle?: (period: CourseSelectionPeriod) => string,
): CalendarEventInternal[] =>
  events.flatMap((event) => {
    const period = parseCourseSelectionPeriod(event as AcademicCalendarEvent);
    const startDate = period?.startDate ?? event.date;
    const endDate = period?.endDate ?? event.date;
    const start = fromTaipeiDateKey(startDate);
    if (Number.isNaN(start.getTime())) return [];

    const parsedEnd = fromTaipeiDateKey(endDate);
    if (Number.isNaN(parsedEnd.getTime())) return [];

    const end = endOfTaipeiDay(parsedEnd);

    return [
      {
        id: "nthu-" + event.id,
        title: period
          ? (getSelectionTitle?.(period) ?? event.summary)
          : event.summary,
        start,
        end,
        allDay: true,
        color,
        tag: "NTHU",
        actualEnd: end,
        repeat: null,
        readonly: true,
      },
    ];
  });
