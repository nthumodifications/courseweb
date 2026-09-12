import {
  differenceInTaipeiCalendarDays,
  endOfTaipeiDay,
  formatTaipei,
  fromTaipeiDateKey,
  getTaipeiAcademicCalendarQuery,
  getTaipeiDateKey,
  getTaipeiDay,
  getTaipeiWeek,
  isSameTaipeiMonth,
  isSameTaipeiWeek,
  isTaipeiDateKey,
  startOfTaipeiDay,
} from "@/helpers/dates";
import { cn } from "@courseweb/ui";
import { isTaipeiToday } from "@/helpers/dates";
import { useCalendar } from "./calendar_hook";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { getContrastColor, getBrightness } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import { useMediaQuery } from "usehooks-ts";
import { Fragment, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEventInternal } from "@/components/Calendar/calendar.types";
import { useSettings } from "@/hooks/contexts/settings";
import client from "@/config/api";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useCourseDates from "@/hooks/useCourseDates";
import { getLocale } from "@/helpers/dateLocale";
import useDictionary from "@/dictionaries/useDictionary";

export const CalendarMonthContainer = ({
  displayMonth,
  onChangeView,
}: {
  displayMonth: Date[];
  onChangeView: (view: "week", date: Date) => void;
}) => {
  const { events } = useCalendar();
  const { language, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const { courses } = useUserTimetable();
  const enrolledCourseIds = useMemo(
    () => Object.values(courses).flat(),
    [courses],
  );
  const { getCourseDateForDay } = useCourseDates(enrolledCourseIds);

  const isScreenMD = useMediaQuery("(min-width: 768px)");
  const rows_length = Math.ceil(displayMonth.length / 7);

  // Resolve the NTHU event color from the CSS custom property at render time so
  // that color-utility helpers (getBrightness / getContrastColor) receive an
  // actual hex value rather than an unresolvable "var(...)" string.
  const nthuEventColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--color-nthu-event")
          .trim() || "#A973D9"
      : "#A973D9";

  const {
    data: nthuCalendarEvents = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<CalendarEventInternal[]>({
    queryKey: [
      "event",
      getTaipeiDateKey(displayMonth[0]),
      getTaipeiDateKey(displayMonth[displayMonth.length - 1]),
    ],
    queryFn: async () => {
      const query = getTaipeiAcademicCalendarQuery(
        getTaipeiDateKey(displayMonth[0]),
        getTaipeiDateKey(displayMonth[displayMonth.length - 1]),
      );
      if (!query) return [];

      const res = await client.acacalendar.$get({
        query,
      });
      const nthuEvents = await res.json();
      return nthuEvents.flatMap((event) => {
        if (!isTaipeiDateKey(event.date)) return [];
        const start = fromTaipeiDateKey(event.date);
        const end = endOfTaipeiDay(start);
        return {
          id: "nthu-" + event.id,
          title: event.summary,
          start,
          end,
          allDay: true,
          color: nthuEventColor,
          tag: "NTHU",
          actualEnd: end,
          repeat: null,
          readonly: true,
        } as CalendarEventInternal;
      });
    },
    enabled: showAcademicCalendar,
  });
  const renderEventsInDay = useCallback(
    (day: Date, padding: number) => {
      const dayEvents = eventsToDisplay(
        events,
        startOfTaipeiDay(day),
        endOfTaipeiDay(day),
      ).map((event) => {
        const courseDate = event.courseId
          ? getCourseDateForDay(event.courseId, day)
          : null;
        const isNoClass = courseDate?.type === "no_class";
        const brightness = getBrightness(event.color);
        const textColor = isNoClass ? "#fff" : getContrastColor(event.color);
        return { ...event, textColor, courseDate, isNoClass };
      });

      // Group overlapping events
      const groupedEvents: (typeof dayEvents)[] = [];
      dayEvents.forEach((event) => {
        let added = false;
        for (const group of groupedEvents) {
          if (
            group.some(
              (e) =>
                (event.displayStart >= e.displayStart &&
                  event.displayStart < e.displayEnd) ||
                (event.displayEnd > e.displayStart &&
                  event.displayEnd <= e.displayEnd) ||
                (event.displayStart <= e.displayStart &&
                  event.displayEnd >= e.displayEnd),
            )
          ) {
            group.push(event);
            added = true;
            break;
          }
        }
        if (!added) {
          groupedEvents.push([event]);
        }
      }); // Flatten all events from all groups and sort them by start time
      // This creates a single sorted array of all events for the day
      const allSortedEvents = groupedEvents
        .flat()
        .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime());

      return (
        <div className="flex flex-col gap-1 mt-1" key={day.getTime()}>
          {Array(padding)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="w-full"
                style={{ height: isScreenMD ? 20 : 16 }}
              ></div>
            ))}
          {allSortedEvents.map((event, index) => (
            <EventPopover key={index} event={event}>
              <button
                type="button"
                className="rounded-md border-0 bg-transparent p-1 md:p-1 flex flex-row gap-1 items-center text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{
                  background: event.isNoClass
                    ? "repeating-linear-gradient(-45deg, #9ca3af, #9ca3af 4px, #6b7280 4px, #6b7280 8px)"
                    : event.color,
                  color: event.textColor,
                  height: isScreenMD ? 20 : 16,
                  width: "100%",
                }}
              >
                {!event.isNoClass && (
                  <div className="hidden md:inline text-[10px] font-normal leading-none tabular-nums">
                    {formatTaipei(event.displayStart, "HH:mm", {
                      locale: getLocale(language),
                    })}
                  </div>
                )}
                <div className="text-xs leading-none whitespace-nowrap overflow-hidden">
                  {event.title}
                </div>
              </button>
            </EventPopover>
          ))}
        </div>
      );
    },
    [events, isScreenMD, getCourseDateForDay, language],
  );

  const renderAllDayEvents = useCallback(
    (start: Date, end: Date) => {
      const filteredEvents = eventsToDisplay(
        showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
        startOfTaipeiDay(start),
        endOfTaipeiDay(end),
      ).filter((e) => e.allDay);

      const allDayEvents = filteredEvents.map((event) => {
        // Snap the event to the start if it starts before the start of the week
        const snippetStart = isSameTaipeiWeek(start, event.start)
          ? event.start
          : startOfTaipeiDay(start);
        // Snap the event to the end if it ends after the end of the week
        const snippetEnd = isSameTaipeiWeek(end, event.end)
          ? event.end
          : endOfTaipeiDay(end);
        // Determine the text color
        const brightness = getBrightness(event.color);
        // From the brightness, using the getContrastColor function, create a complementary color that is legible
        const textColor = getContrastColor(event.color);
        const span = Math.min(
          differenceInTaipeiCalendarDays(snippetEnd, snippetStart) + 1,
          7 - getTaipeiDay(snippetStart) + 1,
        );
        const left = (100 / 7) * getTaipeiDay(snippetStart);
        const width = (100 / 7) * span;
        // calculate the index in that day, to determine the top position
        const events = filteredEvents.filter(
          (m) => m.start <= event.start && m.end >= event.end,
        );
        const index = events.indexOf(event);
        const top = 33 + index * (isScreenMD ? 22 : 18);

        return { ...event, textColor, left, width, top };
      });

      return allDayEvents.map((event, index) => (
        <EventPopover key={index} event={event}>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{
              position: "absolute",
              top: `${event.top}px`,
              left: `calc(${event.left}%)`,
              width: `calc(${event.width}%)`,
            }}
          >
            <div
              className="bg-primary rounded-md p-1 md:p-1 flex flex-row gap-1 items-center cursor-pointer select-none"
              style={{ background: event.color, color: event.textColor }}
            >
              <div className="text-xs leading-none whitespace-nowrap overflow-hidden">
                {event.title}
              </div>
            </div>
          </button>
        </EventPopover>
      ));
    },
    [events, isScreenMD, nthuCalendarEvents, showAcademicCalendar],
  );

  const renderRow = useCallback(
    (day: Date, colIndex: number) => {
      //check for any allday events that exists in the day
      const allDayEvents = eventsToDisplay(
        showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
        startOfTaipeiDay(day),
        endOfTaipeiDay(day),
      ).filter((e) => e.allDay);

      return (
        <Fragment key={day.getTime()}>
          {getTaipeiDay(day) === 0 &&
            renderAllDayEvents(getTaipeiWeek(day)[0], getTaipeiWeek(day)[6])}
          <div
            className={cn(
              "flex flex-col gap-1 min-h-[120px] border-t border-l border-border last:border-b last:border-r",
              isSameTaipeiMonth(day, displayMonth[15]) ? "" : "bg-foreground/5",
            )}
          >
            <button
              type="button"
              className={cn(
                "border-0 bg-transparent text-sm font-semibold cursor-pointer p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isTaipeiToday(day)
                  ? "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                  : "",
              )}
              aria-label={dict.calendar.accessibility.open_day.replace(
                "{date}",
                formatTaipei(day, "PPP", { locale: getLocale(language) }),
              )}
              onClick={() => onChangeView("week", day)}
            >
              {formatTaipei(day, "d", { locale: getLocale(language) })}
            </button>
            {renderEventsInDay(day, allDayEvents.length)}
          </div>
        </Fragment>
      );
    },
    [
      events,
      displayMonth,
      renderAllDayEvents,
      renderEventsInDay,
      onChangeView,
      language,
    ],
  );

  return (
    <div className="overflow-x-auto flex-1">
      <div className="flex flex-col md:min-w-0 h-full">
        <div className="grid grid-cols-7 gap-4">
          {displayMonth.slice(0, 7).map((day, index) => (
            <div
              key={index}
              className="text-muted-foreground text-sm font-semibold text-center"
            >
              {formatTaipei(day, "EEE", { locale: getLocale(language) })}
            </div>
          ))}
        </div>
        <div
          className="grid flex-1"
          style={{ gridTemplateRows: `repeat(${rows_length}, 1fr)` }}
        >
          {Array.from({ length: rows_length }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 relative">
              {displayMonth
                .slice(rowIndex * 7, rowIndex * 7 + 7)
                .map((day, colIndex) => renderRow(day, colIndex))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
