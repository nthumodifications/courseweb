"use client";
import { EventData } from "@/types/calendar_event";
import { format, formatRelative, getDay, isSameDay } from "date-fns";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { scheduleTimeSlots } from "@/const/timetable";
import { FC, useMemo, useState, useEffect } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { Cloud, MapPin, Clock } from "lucide-react";
import { apps } from "@/const/apps";
import { getSemester, lastSemester } from "@/const/semester";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import useTime from "@/hooks/useTime";
import { NoClassPickedReminder } from "./NoClassPickedReminder";
import { TimetableItemDrawer } from "@/components/Timetable/TimetableItemDrawer";
import AppItem from "@/app/[lang]/(mods-pages)/apps/AppItem";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { Badge } from "../ui/badge";
import WeatherIcon from "./WeatherIcon";
import { cn } from "@/lib/utils";

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
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
      const res = await client.acacalendar.$get({
        query: {
          start: days[0].toISOString(),
          end: days[4].toISOString(),
        },
      });
      return await res.json();
    },
    enabled: showAcademicCalendar && isClient,
    initialData: [],
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
        <div className="flex flex-row gap-2 items-start">
          <div className="size-4 rounded-sm mt-1 flex items-center justify-center">
            🎉
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{dict.today.noclass}</div>
            <div className="text-xs text-muted-foreground">
              {dict.today.noclass_sub}
            </div>
          </div>
        </div>
      );

    return classesThisDay
      .sort((a, b) => a.startTime - b.startTime)
      .map((t, index) => (
        <TimetableItemDrawer course={t.course} key={index}>
          <div className="flex flex-row gap-2 items-start">
            <div
              className="size-4 rounded-sm mt-1"
              style={{ backgroundColor: t.color }}
            ></div>
            <div className="flex flex-col gap-1">
              <div className="font-semibold"> {t.course.name_zh} </div>
              <div className="text-xs text-muted-foreground align-baseline">
                <Clock className="size-3 inline mr-1" />
                {`${scheduleTimeSlots[t.startTime].start} - ${scheduleTimeSlots[t.endTime].end}`}
              </div>
              <div className="text-xs text-muted-foreground align-baseline">
                <MapPin className="size-3 inline mr-1" />
                {t.venue}
              </div>
            </div>
          </div>
        </TimetableItemDrawer>
      ));
  };

  const renderCalendars = (day: Date) => {
    if (!showAcademicCalendar || !isClient) return <></>;
    const events = calendar.filter((event) =>
      isSameDay(new Date(event.date), day),
    );
    return (
      !calendarLoading &&
      events.length > 0 &&
      events.map((event, index) => (
        <div key={index} className="flex flex-row gap-2 items-start">
          <div className="size-4 bg-nthu-500 rounded-sm shrink-0 mt-1"></div>
          <div className="text-sm">{event.summary}</div>
        </div>
      ))
    );
  };

  const renderWeather = (day: Date) => {
    if (!isClient) return null;

    const weatherData = weather?.find(
      (w) => w.date == format(day, "yyyy-MM-dd"),
    );
    if (!weatherData) return <></>;

    // Check if weatherData.weatherData is empty or doesn't contain necessary data
    if (
      !weatherData.weatherData ||
      Object.keys(weatherData.weatherData).length === 0 ||
      !weatherData.weatherData.Wx
    ) {
      return (
        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
          <Cloud className="h-5 w-5 text-gray-400" />
          <span className="text-muted-foreground text-xs">資料更新中</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
        <WeatherIcon wxCode={weatherData.weatherData.Wx} />
        <span className="font-medium">{weatherData.weatherData.MaxT}°</span>
        <span className="text-muted-foreground text-xs">
          {weatherData.weatherData.MinT}°
        </span>
        <Badge variant="outline" className="ml-1 text-xs">
          {weatherData.weatherData.PoP12h}%
        </Badge>
      </div>
    );
  };

  const applist = apps.filter((app) => pinnedApps.includes(app.id));
  const renderPinnedApps = () => {
    return (
      <div className="flex flex-row flex-wrap gap-4 pb-2">
        {applist.map((app, index) => (
          <AppItem key={index} app={app} mini />
        ))}
      </div>
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
          <div className="flex flex-row justify-between">
            <div className="flex flex-row flex-1 items-baseline gap-2">
              <div
                className={cn(
                  "whitespace-nowrap font-semibold text-lg",
                  !isSameDay(day, date) && "text-muted-foreground",
                )}
              >
                {formatRelative(day, Date.now(), {
                  locale: getLocale(language),
                })}
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {format(
                  day,
                  isSameDay(day, date) ? "EEE, MMMM do" : "MMMM do",
                  { locale: getLocale(language) },
                )}
              </div>
            </div>
            {isClient && !weatherLoading && weather && renderWeather(day)}
          </div>
          {renderCalendars(day)}
          {renderDayTimetable(day)}
        </div>
      ))}
    </div>
  );
};

export default TodaySchedule;
