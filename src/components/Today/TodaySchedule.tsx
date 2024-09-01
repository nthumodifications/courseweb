"use client";
import { EventData } from "@/types/calendar_event";
import { format, formatRelative, getDay, isSameDay, parse } from "date-fns";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { scheduleTimeSlots } from "@/const/timetable";
import { FC, useMemo } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import { AlertDefinition } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import WeatherIcon from "./WeatherIcon";
import { getLocale } from "@/helpers/dateLocale";
import { Info, CalendarRange } from "lucide-react";
import { WeatherData } from "@/types/weather";
import { apps } from "@/const/apps";
import Link from "next/link";
import { getSemester, lastSemester } from "@/const/semester";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { VenueChip } from "../Timetable/VenueChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useTime from "@/hooks/useTime";
import { NoClassPickedReminder } from "./NoClassPickedReminder";
import { TimetableItemDrawer } from "@/components/Timetable/TimetableItemDrawer";
import AppItem from "@/app/[lang]/(mods-pages)/apps/AppItem";
import { useQuery } from "@tanstack/react-query";
import { getNTHUCalendar } from "@/lib/calendar_event";

const getRangeOfDays = (start: Date, end: Date) => {
  const days = [];
  for (let i = start.getTime(); i <= end.getTime(); i += 86400000) {
    days.push(new Date(i));
  }
  return days;
};

const TodaySchedule: FC = () => {
  const { isCoursesEmpty, colorMap, getSemesterCourses } = useUserTimetable();
  const { language, pinnedApps, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const date = useTime();

  const curr_sem = useMemo(() => getSemester(date), [date]);
  const timetableData = useMemo(
    () =>
      createTimetableFromCourses(
        getSemesterCourses(curr_sem?.id) as MinimalCourse[],
        colorMap,
      ),
    [getSemesterCourses, curr_sem, colorMap],
  );
  //sort display_courses according to courses[semester]
  const displayCourseData = useMemo(
    () => getSemesterCourses(lastSemester.id),
    [getSemesterCourses],
  );

  const nextTimetableData = useMemo(
    () =>
      createTimetableFromCourses(
        displayCourseData as MinimalCourse[],
        colorMap,
      ),
    [displayCourseData, colorMap],
  );

  //get a range of 5 days starting from today
  const days = useMemo(
    () => getRangeOfDays(date, new Date(date.getTime() + 86400000 * 4)),
    [date],
  );

  const {
    data: weather,
    error: weatherError,
    isLoading: weatherLoading,
  } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/weather");
      const data = await res.json();
      return data;
    },
  });

  const {
    data: calendar = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<EventData[]>({
    queryKey: [
      "event",
      format(days[0], "yyyy-MM-dd"),
      format(days[4], "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      return getNTHUCalendar(days[0], days[4]);
    },
    enabled: showAcademicCalendar,
  });

  const renderDayTimetable = (day: Date) => {
    if (!curr_sem)
      return (
        <div className="text-gray-500 dark:text-gray-400 text-center text-sm font-semibold">
          {dict.today.noclass_sem}
        </div>
      );
    const classesThisDay = (
      curr_sem == lastSemester ? nextTimetableData : timetableData
    ).filter((t) => t.dayOfWeek == [6, 0, 1, 2, 3, 4, 5][getDay(day)]);

    if (classesThisDay.length == 0)
      return (
        <div className="flex flex-col items-center text-gray-800 dark:text-gray-500">
          <span className="text-sm font-semibold">{dict.today.noclass}</span>
          <span className="text-xs">{dict.today.noclass_sub}</span>
        </div>
      );

    return classesThisDay
      .sort((a, b) => a.startTime - b.startTime)
      .map((t, index) => (
        <TimetableItemDrawer course={t.course} key={index}>
          <div className="flex flex-row" key={index}>
            <div className="flex flex-col justify-between text-sm pr-1 py-[2px] text-gray-400 w-11">
              <p>{scheduleTimeSlots[t.startTime].start}</p>
              <p>{scheduleTimeSlots[t.endTime].end}</p>
            </div>
            <div
              className="flex flex-col rounded-md p-2 flex-1"
              style={{ background: t.color, color: t.textColor }}
            >
              <p className="font-semibold">{t.course.name_zh}</p>
              <p className="text-xs">{t.course.name_en}</p>
              <div className="w-fit mt-1">
                <VenueChip
                  venue={t.venue}
                  color={t.textColor}
                  textColor={t.color}
                />
              </div>
            </div>
          </div>
        </TimetableItemDrawer>
      ));
  };

  const applist = apps.filter((app) => pinnedApps.includes(app.id));
  const renderPinnedApps = () => {
    if (applist.length == 0) return <></>;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-row flex-wrap gap-2 pb-2 justify-evenly">
          {applist.map((app, index) => (
            <AppItem key={index} app={app} mini />
          ))}
        </div>
      </div>
    );
  };
  const renderCalendars = (day: Date) => {
    if (!showAcademicCalendar) return <></>;
    const events = calendar.filter((event) =>
      isSameDay(new Date(event.date), day),
    );
    return (
      !calendarLoading &&
      events.length > 0 && (
        <Alert className="p-2">
          <AlertDescription>
            <ul className="divide-y divide-border text-sm text-muted-foreground">
              {events.map((event) => (
                <li key={event.id} className="text-sm py-1">
                  {event.summary}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )
    );
  };

  return (
    <div className="h-full w-full px-3 md:px-8 space-y-4">
      {isCoursesEmpty && <NoClassPickedReminder />}
      {renderPinnedApps()}
      {days.map((day) => (
        <div
          className="flex flex-col gap-2 pb-4"
          key={format(day, "EEEE, do MMMM")}
        >
          <div className="flex flex-row gap-2 justify-between border-b border-gray-400 pb-2">
            <div className="flex flex-col flex-1">
              {/* WEDNESDAY */}
              <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                {formatRelative(day, Date.now(), {
                  locale: getLocale(language),
                })}
              </div>
              {/* 6TH OCTOBER */}
              <div className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                {format(day, "EEEE, do MMMM", { locale: getLocale(language) })}
              </div>
            </div>
            {!weatherLoading && weather && (
              <WeatherIcon
                date={day}
                weather={
                  weather!.find((w) => w.date == format(day, "yyyy-MM-dd"))!
                }
              />
            )}
          </div>
          {renderCalendars(day)}
          {renderDayTimetable(day)}
        </div>
      ))}
    </div>
  );
};

export default TodaySchedule;
