import { useMemo } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useQuery } from "@tanstack/react-query";
import { semesterInfo } from "@courseweb/shared";
import { EventData } from "@/types/calendar_event";
import { MinimalCourse } from "@/types/courses";
import {
  CalendarEvent,
  CalendarEventInternal,
  DisplayCalendarEvent,
} from "@/components/Calendar/calendar.types";
import { timetableToCalendarEvent } from "@/components/Calendar/timetableToCalendarEvent";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { useCalendar } from "@/components/Calendar/calendar_hook";
import client from "@/config/api";
import useCourseDates, { CourseDate } from "@/hooks/useCourseDates";
import useTime from "@/hooks/useTime";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useSettings } from "@/hooks/contexts/settings";
import {
  addTaipeiDays,
  fromTaipeiDateKey,
  getTaipeiDateKey,
  getTaipeiDateRange,
  isTaipeiDateKey,
  TAIPEI_TIME_ZONE,
  toAcademicCalendarBoundary,
} from "@/helpers/dates";

export const UPCOMING_TIME_ZONE = TAIPEI_TIME_ZONE;
export {
  addTaipeiDays,
  fromTaipeiDateKey,
  getTaipeiDateKey,
  getTaipeiDateRange,
  isTaipeiDateKey,
  toAcademicCalendarBoundary,
};
const WALL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";
const DATE_KEY_FORMAT = "yyyy-MM-dd";
const MINUTE_IN_MS = 60 * 1000;

export type UpcomingEventSource =
  | "calendar"
  | "class"
  | "academic"
  | "course-date";

export type UpcomingEventState = "past" | "in-progress" | "upcoming";

export type UpcomingEvent = {
  id: string;
  source: UpcomingEventSource;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  state: UpcomingEventState;
  startsInMinutes: number;
  location?: string;
  details?: string;
  color?: string;
  courseId?: string;
  course?: MinimalCourse;
  courseDate?: Pick<CourseDate, "type" | "title">;
  calendarEvent?: DisplayCalendarEvent;
};

export type UseUpcomingEventsOptions = {
  windowDays?: number;
  start?: Date;
  now?: Date;
  includeAcademicCalendar?: boolean;
  includePast?: boolean;
};

export type UseUpcomingEventsResult = {
  events: UpcomingEvent[];
  nextEvent: UpcomingEvent | null;
  windowStart: Date;
  windowEnd: Date;
  isLoading: boolean;
  error: Error | null;
};

type BaseUpcomingEvent = Omit<UpcomingEvent, "state" | "startsInMinutes">;

type EventDescriptor = {
  event: CalendarEventInternal;
  source: UpcomingEventSource;
  course?: MinimalCourse;
};

const toWallDateTime = (date: Date) =>
  format(toZonedTime(date, UPCOMING_TIME_ZONE), WALL_DATE_TIME_FORMAT);

const fromTaipeiWallDateTime = (date: Date) =>
  fromZonedTime(toWallDateTime(date), UPCOMING_TIME_ZONE);

const fromBrowserWallDateTime = (date: Date) =>
  fromZonedTime(format(date, WALL_DATE_TIME_FORMAT), UPCOMING_TIME_ZONE);

const normalizeRepeatValue = (repeat: NonNullable<CalendarEvent["repeat"]>) => {
  if (repeat.mode === "count") return repeat.value;
  const range = getTaipeiDateRange(getTaipeiDateKey(new Date(repeat.value)));
  return range ? range.end.getTime() - 1 : repeat.value;
};


export const getTaipeiDayStart = (date: Date) =>
  fromTaipeiDateKey(getTaipeiDateKey(date));

const addTaipeiInterval = (
  date: Date,
  type: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
) => {
  const wallDate = toZonedTime(date, UPCOMING_TIME_ZONE);
  const nextWallDate =
    type === "daily"
      ? addDays(wallDate, interval)
      : type === "weekly"
        ? addWeeks(wallDate, interval)
        : type === "monthly"
          ? addMonths(wallDate, interval)
          : addYears(wallDate, interval);
  return fromTaipeiWallDateTime(nextWallDate);
};

const getInitialOccurrenceIndex = (
  event: CalendarEventInternal,
  windowStart: Date,
) => {
  if (!event.repeat || event.start >= windowStart) return 0;

  const interval = Math.max(1, event.repeat.interval || 1);
  const startWall = toZonedTime(event.start, UPCOMING_TIME_ZONE);
  const windowWall = toZonedTime(windowStart, UPCOMING_TIME_ZONE);
  const difference =
    event.repeat.type === "daily"
      ? differenceInCalendarDays(windowWall, startWall)
      : event.repeat.type === "weekly"
        ? Math.floor(differenceInCalendarDays(windowWall, startWall) / 7)
        : event.repeat.type === "monthly"
          ? differenceInMonths(windowWall, startWall)
          : differenceInYears(windowWall, startWall);

  // Keep one occurrence before the window so long-running events can still
  // overlap the window start.
  return Math.max(0, Math.floor(difference / interval) - 1);
};

const isExcludedOccurrence = (event: CalendarEventInternal, start: Date) => {
  const dateKey = getTaipeiDateKey(start);
  return (event.excludedDates ?? []).some(
    (excludedDate) => getTaipeiDateKey(excludedDate) === dateKey,
  );
};

const normalizeTimetableEvent = (
  event: CalendarEvent,
): CalendarEventInternal => {
  // timetableToCalendarEvent creates wall-clock Dates with the browser's
  // calendar fields; interpret those fields as Taipei time explicitly.
  const start = fromBrowserWallDateTime(event.start);
  const end = fromBrowserWallDateTime(event.end);
  const repeat = event.repeat
    ? {
        ...event.repeat,
        value: normalizeRepeatValue(event.repeat),
      }
    : null;
  return {
    ...event,
    start,
    end,
    repeat,
    actualEnd: repeat?.mode === "date" ? new Date(repeat.value) : end,
  };
};

const toDisplayCalendarEvent = (
  event: CalendarEventInternal,
  start: Date,
  end: Date,
): DisplayCalendarEvent => ({
  ...event,
  start,
  end,
  displayStart: start,
  displayEnd: end,
});

const expandCalendarEvent = (
  descriptor: EventDescriptor,
  windowStart: Date,
  windowEnd: Date,
  getCourseDateForDay: (rawId: string, day: Date) => CourseDate | null,
): BaseUpcomingEvent[] => {
  const { event, source, course } = descriptor;
  const duration = Math.max(event.end.getTime() - event.start.getTime(), 1);
  const occurrences: BaseUpcomingEvent[] = [];
  const initialIndex = getInitialOccurrenceIndex(event, windowStart);
  const repeat = event.repeat;
  let occurrenceStart =
    initialIndex === 0
      ? event.start
      : addTaipeiInterval(
          event.start,
          repeat?.type ?? "daily",
          (repeat?.interval || 1) * initialIndex,
        );

  for (let index = initialIndex; index < initialIndex + 10000; index += 1) {
    if (repeat?.mode === "count" && index >= repeat.value) break;
    if (repeat?.mode === "date" && occurrenceStart.getTime() > repeat.value) {
      break;
    }

    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
    if (occurrenceStart >= windowEnd) break;

    if (
      occurrenceStart < windowEnd &&
      occurrenceEnd > windowStart &&
      !isExcludedOccurrence(event, occurrenceStart)
    ) {
      const courseDate =
        source === "class" && course
          ? getCourseDateForDay(course.raw_id, occurrenceStart)
          : null;
      occurrences.push({
        id: `${source}:${event.id}:${occurrenceStart.getTime()}`,
        source,
        title: event.title,
        start: occurrenceStart,
        end: occurrenceEnd,
        allDay: event.allDay,
        location: event.location,
        details: event.details,
        color: event.color,
        // Persisted events use null for hand-made entries; the UI type treats
        // an absent courseId as "not a course event".
        courseId: event.courseId ?? undefined,
        ...(course ? { course } : {}),
        ...(courseDate
          ? {
              courseDate: {
                type: courseDate.type,
                title: courseDate.title,
              },
            }
          : {}),
        ...(source === "calendar"
          ? {
              calendarEvent: toDisplayCalendarEvent(
                event,
                occurrenceStart,
                occurrenceEnd,
              ),
            }
          : {}),
      });
    }

    if (!repeat) break;
    occurrenceStart = addTaipeiInterval(
      occurrenceStart,
      repeat.type,
      repeat.interval || 1,
    );
  }

  return occurrences;
};

const sourceOrder: Record<UpcomingEventSource, number> = {
  academic: 0,
  "course-date": 1,
  class: 2,
  calendar: 3,
};

const sortEvents = (a: UpcomingEvent, b: UpcomingEvent) => {
  const startDifference = a.start.getTime() - b.start.getTime();
  if (startDifference !== 0) return startDifference;
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const sourceDifference = sourceOrder[a.source] - sourceOrder[b.source];
  if (sourceDifference !== 0) return sourceDifference;
  return a.id.localeCompare(b.id);
};

const toError = (error: unknown) =>
  error instanceof Error ? error : error ? new Error(String(error)) : null;

const useUpcomingEvents = (
  options: UseUpcomingEventsOptions = {},
): UseUpcomingEventsResult => {
  const clock = useTime(60 * 1000);
  const { events: calendarEvents } = useCalendar();
  const {
    courses,
    colorMap,
    getSemesterCourses,
    isLoading: timetableLoading,
    error: timetableError,
  } = useUserTimetable();
  const { language, showAcademicCalendar } = useSettings();
  const enrolledCourseIds = useMemo(
    () => Object.values(courses).flat(),
    [courses],
  );
  const { getCourseDateForDay } = useCourseDates(enrolledCourseIds);

  const now = options.now ?? clock;
  const todayKey = getTaipeiDateKey(now);
  const defaultWindowStart = useMemo(
    () => fromZonedTime(`${todayKey}T00:00:00.000`, UPCOMING_TIME_ZONE),
    [todayKey],
  );
  const windowStart = options.start ?? defaultWindowStart;
  const windowDays = Math.max(1, Math.floor(options.windowDays ?? 7));
  const windowEnd = useMemo(
    () => addTaipeiDays(windowStart, windowDays),
    [windowStart, windowDays],
  );
  const includeAcademicCalendar =
    showAcademicCalendar && (options.includeAcademicCalendar ?? true);

  const startKey = getTaipeiDateKey(windowStart);
  const endKey = getTaipeiDateKey(windowEnd);
  const {
    data: academicCalendar = [],
    isLoading: academicLoading,
    error: academicError,
  } = useQuery<EventData[], Error>({
    queryKey: ["academic-calendar", startKey, endKey],
    queryFn: async () => {
      const response = await client.acacalendar.$get({
        query: {
          start: toAcademicCalendarBoundary(startKey),
          end: toAcademicCalendarBoundary(endKey),
        },
      });
      return response.json();
    },
    enabled: includeAcademicCalendar,
    initialData: [],
  });

  const semesters = useMemo(
    () =>
      semesterInfo.filter((semester) => {
        // semesterInfo stores calendar dates as local Date objects. Read the
        // source date fields, then make the Taipei boundary explicit.
        const range = getTaipeiDateRange(
          format(semester.begins, DATE_KEY_FORMAT),
          format(semester.ends, DATE_KEY_FORMAT),
        );
        return (
          range !== null && range.end > windowStart && range.start < windowEnd
        );
      }),
    [windowEnd, windowStart],
  );
  const timetableData = useMemo(
    () =>
      semesters.flatMap((semester) =>
        createTimetableFromCourses(
          getSemesterCourses(semester.id) as MinimalCourse[],
          colorMap,
        ),
      ),
    [colorMap, getSemesterCourses, semesters],
  );
  const classEvents = useMemo(
    () =>
      timetableToCalendarEvent(timetableData, language).map(
        normalizeTimetableEvent,
      ),
    [language, timetableData],
  );
  const dayStarts = useMemo(
    () =>
      Array.from({ length: windowDays }, (_, index) =>
        addTaipeiDays(windowStart, index),
      ),
    [windowDays, windowStart],
  );

  const rawEvents = useMemo(() => {
    const descriptors: EventDescriptor[] = [
      ...calendarEvents.map((event) => ({
        event,
        source: "calendar" as const,
      })),
      ...classEvents.map((event) => ({
        event,
        source: "class" as const,
        course: timetableData.find(
          (slot) => slot.course.raw_id === event.courseId,
        )?.course,
      })),
    ];
    const expandedEvents = descriptors.flatMap((descriptor) =>
      expandCalendarEvent(
        descriptor,
        windowStart,
        windowEnd,
        getCourseDateForDay,
      ),
    );

    const courseDateEvents: BaseUpcomingEvent[] = [];
    const seenCourseDates = new Set<string>();
    for (const dayStart of dayStarts) {
      for (const slot of timetableData) {
        const courseDate = getCourseDateForDay(slot.course.raw_id, dayStart);
        if (!courseDate) continue;
        const dateKey = getTaipeiDateKey(dayStart);
        const id = `course-date:${slot.course.raw_id}:${dateKey}:${courseDate.type}:${courseDate.title}`;
        if (seenCourseDates.has(id)) continue;
        seenCourseDates.add(id);
        const title = courseDate.title || courseDate.type;
        const courseName =
          language === "zh" ? slot.course.name_zh : slot.course.name_en;
        courseDateEvents.push({
          id,
          source: "course-date",
          title: `${courseName} · ${title}`,
          start: dayStart,
          end: addTaipeiDays(dayStart, 1),
          allDay: true,
          color: "#64748b",
          courseId: slot.course.raw_id,
          course: slot.course,
          courseDate: { type: courseDate.type, title: courseDate.title },
        });
      }
    }

    const academicEvents: BaseUpcomingEvent[] = includeAcademicCalendar
      ? academicCalendar.flatMap((event) => {
          if (!event.summary || !isTaipeiDateKey(event.date)) return [];
          const range = getTaipeiDateRange(event.date);
          if (!range) return [];
          return [
            {
              id: `academic:${event.id}`,
              source: "academic" as const,
              title: event.summary,
              start: range.start,
              end: range.end,
              allDay: true,
              color: "#0ea5e9",
            },
          ];
        })
      : [];

    return [...expandedEvents, ...courseDateEvents, ...academicEvents];
  }, [
    academicCalendar,
    calendarEvents,
    classEvents,
    dayStarts,
    getCourseDateForDay,
    includeAcademicCalendar,
    language,
    timetableData,
    windowEnd,
    windowStart,
  ]);

  const events = useMemo(() => {
    const withState = rawEvents.map((event): UpcomingEvent => {
      const state: UpcomingEventState =
        event.start > now
          ? "upcoming"
          : event.end > now
            ? "in-progress"
            : "past";
      return {
        ...event,
        state,
        startsInMinutes:
          state === "upcoming"
            ? Math.max(
                0,
                Math.ceil(
                  (event.start.getTime() - now.getTime()) / MINUTE_IN_MS,
                ),
              )
            : 0,
      };
    });
    const visibleEvents = options.includePast
      ? withState
      : withState.filter((event) => event.state !== "past");
    return visibleEvents
      .filter((event) => event.start < windowEnd && event.end > windowStart)
      .sort(sortEvents);
  }, [now, options.includePast, rawEvents, windowEnd, windowStart]);

  const nextEvent = useMemo(
    () =>
      events.find((event) => event.state === "in-progress" && !event.allDay) ??
      events.find((event) => event.state === "upcoming" && !event.allDay) ??
      events.find((event) => event.state !== "past") ??
      null,
    [events],
  );

  return {
    events,
    nextEvent,
    windowStart,
    windowEnd,
    isLoading: academicLoading || timetableLoading,
    error: toError(academicError) ?? toError(timetableError),
  };
};

export default useUpcomingEvents;
