import { eachHourOfInterval, format, addMinutes } from "date-fns";
import { cn } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import {
  differenceInTaipeiCalendarDays,
  endOfTaipeiDay,
  formatTaipei,
  fromTaipeiDateKey,
  getTaipeiAcademicCalendarQuery,
  getTaipeiDateKey,
  isSameTaipeiMonth,
  isTaipeiDateKey,
  isTaipeiToday,
  setTaipeiWallClock,
  startOfTaipeiDay,
  toTaipeiWallClock,
} from "@/helpers/dates";
import { useCalendar } from "./calendar_hook";
import { CurrentTimePointer } from "./CurrentTimePointer";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { getContrastColor } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import {
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEventInternal } from "./calendar.types";
import { useSettings } from "@/hooks/contexts/settings";
import client from "@/config/api";
import { AddEventButton } from "./AddEventButton";
import { getNearestTime } from "@courseweb/ui";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useCourseDates from "@/hooks/useCourseDates";
import { getLocale } from "@/helpers/dateLocale";
import useDictionary from "@/dictionaries/useDictionary";

export const CalendarWeekContainer = ({
  displayWeek,
  overlayEvents = [],
}: {
  displayWeek: Date[];
  overlayEvents?: CalendarEventInternal[];
}) => {
  const { events, addEvent, displayContainer, HOUR_HEIGHT } = useCalendar();
  const { language, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const { courses } = useUserTimetable();
  const enrolledCourseIds = useMemo(
    () => Object.values(courses).flat(),
    [courses],
  );
  const { getCourseDateForDay } = useCourseDates(enrolledCourseIds);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [newEventTime, setNewEventTime] = useState<Date | null>(null);
  const eventFormTriggerRef = useRef<HTMLElement | null>(null);

  // Function to handle clicks on empty time slots
  const handleEmptySlotClick = useCallback(
    (day: Date, clientY: number, e: React.MouseEvent) => {
      // Don't open form if clicked on an existing event
      if ((e.target as HTMLElement).closest(".event-item")) {
        return;
      }

      eventFormTriggerRef.current = e.currentTarget as HTMLElement;

      // Calculate the time based on the click position
      const containerRect = displayContainer.current?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollTop = displayContainer.current?.scrollTop || 0;
      const offsetY = clientY - containerRect.top + scrollTop;

      // Convert the Y position to hours and minutes
      const totalMinutes = (offsetY / HOUR_HEIGHT) * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);

      // Create a new date with the day and calculated time
      const clickedTime = setTaipeiWallClock(day, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });

      // Round to nearest 10 minutes
      const roundedTime = getNearestTime(toTaipeiWallClock(clickedTime), 10);
      const newTime = setTaipeiWallClock(day, {
        hours: roundedTime.hours,
        minutes: roundedTime.minutes,
        seconds: 0,
        milliseconds: 0,
      });

      setNewEventTime(newTime);
      setEventFormOpen(true);
    },
    [displayContainer, HOUR_HEIGHT],
  );

  const handleEmptySlotKeyDown = useCallback(
    (day: Date, event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      eventFormTriggerRef.current = event.currentTarget;
      const nearestTime = getNearestTime(toTaipeiWallClock(new Date()), 10);
      const keyboardTime = setTaipeiWallClock(day, {
        hours: nearestTime.hours,
        minutes: nearestTime.minutes,
        seconds: 0,
        milliseconds: 0,
      });
      setNewEventTime(keyboardTime);
      setEventFormOpen(true);
    },
    [],
  );

  const {
    data: nthuCalendarEvents = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<CalendarEventInternal[]>({
    queryKey: [
      "event",
      getTaipeiDateKey(displayWeek[0]),
      getTaipeiDateKey(displayWeek[6]),
    ],
    queryFn: async () => {
      const query = getTaipeiAcademicCalendarQuery(
        getTaipeiDateKey(displayWeek[0]),
        getTaipeiDateKey(displayWeek[6]),
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
          color: "#A973D9",
          tag: "NTHU",
          actualEnd: end,
          repeat: null,
          readonly: true,
        } as CalendarEventInternal;
      });
    },
    enabled: showAcademicCalendar,
  });

  const hours = eachHourOfInterval({
    start: new Date(2024, 2, 3, 0),
    end: new Date(2024, 2, 3, 23),
  });

  const timeLabelContainer = useRef<HTMLDivElement>(null);
  const headerRow = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Get the height of the headerRow whenever it changes
  useEffect(() => {
    // observe the resize of the headerRow
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    observer.observe(headerRow.current!);
    return () => {
      observer.disconnect();
    };
  }, [headerRow.current?.offsetHeight]);

  // Sync displayContainer scroll with timeLabelContainer
  const handleScroll: UIEventHandler<HTMLDivElement> = (e) => {
    timeLabelContainer.current!.scrollTop = e.currentTarget.scrollTop;
  };

  const renderEventsInDay = useCallback(
    (day: Date) => {
      const dayEnd = endOfTaipeiDay(day);
      const dayEvents = eventsToDisplay(events, startOfTaipeiDay(day), dayEnd)
        .filter((e) => !e.allDay)
        .map((event) => {
          const textColor = getContrastColor(event.color);
          return { ...event, textColor };
        })
        .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime());

      // Assign columns with greedy interval-graph coloring
      const colEndTimes: number[] = [];
      const eventsWithCol = dayEvents.map((event) => {
        let colIndex = colEndTimes.findIndex(
          (t) => t <= event.displayStart.getTime(),
        );
        if (colIndex === -1) {
          colIndex = colEndTimes.length;
          colEndTimes.push(event.displayEnd.getTime());
        } else {
          colEndTimes[colIndex] = event.displayEnd.getTime();
        }
        return { ...event, colIndex };
      });

      // Determine total concurrent columns for each event's time span
      const eventsWithLayout = eventsWithCol.map((event) => {
        const concurrent = eventsWithCol.filter(
          (other) =>
            other.displayStart < event.displayEnd &&
            other.displayEnd > event.displayStart,
        );
        const totalCols = Math.max(...concurrent.map((e) => e.colIndex)) + 1;
        return { ...event, totalCols };
      });

      return eventsWithLayout.map((event, index) => {
        // Cap display end at midnight to avoid negative heights for events crossing midnight
        const cappedEnd = new Date(
          Math.min(event.displayEnd.getTime(), dayEnd.getTime()),
        );
        const heightMs = cappedEnd.getTime() - event.displayStart.getTime();
        const height = Math.max(
          HOUR_HEIGHT / 2,
          (heightMs / (1000 * 60 * 60)) * HOUR_HEIGHT,
        );
        const displayStart = toTaipeiWallClock(event.displayStart);

        const courseDate = event.courseId
          ? getCourseDateForDay(event.courseId, day)
          : null;
        const isNoClass = courseDate?.type === "no_class";
        const isSpecialDate = courseDate && !isNoClass;

        const eventBackground = isNoClass
          ? "repeating-linear-gradient(-45deg, #9ca3af, #9ca3af 4px, #6b7280 4px, #6b7280 8px)"
          : event.color;
        const eventTextColor = isNoClass ? "#fff" : event.textColor;

        return (
          <EventPopover
            key={`${event.id}-${event.displayStart.getTime()}`}
            event={event}
          >
            <button
              type="button"
              className="absolute border-0 bg-transparent p-0 pr-1 text-left event-item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                top:
                  displayStart.getHours() * HOUR_HEIGHT +
                  (displayStart.getMinutes() * HOUR_HEIGHT) / 60,
                height,
                width: `calc(${100 / event.totalCols}% - 2px)`,
                left: `calc(${(100 / event.totalCols) * event.colIndex}% + 1px)`,
              }}
            >
              <div
                className="relative overflow-hidden rounded-md h-full p-1 flex flex-col gap-1 cursor-pointer select-none"
                style={{ background: eventBackground, color: eventTextColor }}
              >
                <div className="text-xs leading-none">{event.title}</div>
                <div className="text-xs font-normal leading-none tabular-nums">
                  {formatTaipei(event.displayStart, "HH:mm")} -{" "}
                  {formatTaipei(cappedEnd, "HH:mm")}
                </div>
                {event.location && (
                  <div className="text-xs leading-none">{event.location}</div>
                )}
                {isSpecialDate && (
                  <div className="text-[9px] leading-none font-semibold uppercase opacity-90 bg-black/20 rounded-sm px-1 py-1 self-start">
                    {courseDate.type}
                  </div>
                )}
              </div>
            </button>
          </EventPopover>
        );
      });
    },
    [events, HOUR_HEIGHT, getCourseDateForDay],
  );

  const renderOverlayEventsInDay = useCallback(
    (day: Date) => {
      const dayEnd = endOfTaipeiDay(day);
      const dayOverlayEvents = eventsToDisplay(
        overlayEvents,
        startOfTaipeiDay(day),
        dayEnd,
      )
        .filter((e) => !e.allDay)
        .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime());

      return dayOverlayEvents.map((event) => {
        const textColor = getContrastColor(event.color);
        const cappedEnd = new Date(
          Math.min(event.displayEnd.getTime(), dayEnd.getTime()),
        );
        const heightMs = cappedEnd.getTime() - event.displayStart.getTime();
        const height = Math.max(
          HOUR_HEIGHT / 2,
          (heightMs / (1000 * 60 * 60)) * HOUR_HEIGHT,
        );
        const displayStart = toTaipeiWallClock(event.displayStart);
        return (
          <div
            key={`overlay-${event.id}-${event.displayStart.getTime()}`}
            className="absolute pr-1 pointer-events-none"
            style={{
              top:
                displayStart.getHours() * HOUR_HEIGHT +
                (displayStart.getMinutes() * HOUR_HEIGHT) / 60,
              height,
              width: "calc(100% - 2px)",
              left: "1px",
              opacity: 0.45,
              zIndex: 1,
            }}
          >
            <div
              className="rounded-md h-full p-1 flex flex-col gap-1 border-2"
              style={{
                borderColor: event.color,
                background: `${event.color}33`,
              }}
            >
              <div
                className="text-xs leading-none font-medium"
                style={{ color: textColor }}
              >
                {event.title}
              </div>
            </div>
          </div>
        );
      });
    },
    [overlayEvents, HOUR_HEIGHT],
  );
  const dayEvents = useMemo(() => {
    // Step 1: Prepare events with display information
    const dayEvents = eventsToDisplay(
      showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
      startOfTaipeiDay(displayWeek[0]),
      endOfTaipeiDay(displayWeek[6]),
    )
      .filter((e) => {
        return e.allDay;
      })
      .map((event) => {
        const textColor = getContrastColor(event.color);
        let span =
          differenceInTaipeiCalendarDays(event.displayEnd, event.displayStart) +
          1;
        // get start date wrt to this week
        const dispStart =
          differenceInTaipeiCalendarDays(event.displayStart, displayWeek[0]) > 0
            ? event.displayStart
            : displayWeek[0];
        // Calculate which column this event starts at
        let gridColumnStart: number = 1; // Start with 1 as grid columns are 1-indexed
        if (
          differenceInTaipeiCalendarDays(event.displayStart, displayWeek[0]) > 0
        )
          gridColumnStart =
            differenceInTaipeiCalendarDays(event.displayStart, displayWeek[0]) +
            1;
        else {
          gridColumnStart = 1; // Events starting before the week start at column 1
          span =
            differenceInTaipeiCalendarDays(event.displayEnd, displayWeek[0]) +
            1;
        }
        if (span > 7) {
          span = 7;
        }

        return {
          ...event,
          textColor,
          span,
          gridColumnStart,
          dispStart,
          gridRowStart: 0, // Will be assigned in next step
        };
      })
      .sort((a, b) => {
        // Sort by start date first, then by span length (longer events first)
        const dateCompare = a.displayStart.getTime() - b.displayStart.getTime();
        if (dateCompare === 0) {
          return b.span - a.span; // Longer events first
        }
        return dateCompare;
      });

    // Step 2: Assign row positions to events to maximize row usage
    const rows: number[][] = []; // Tracks occupied columns in each row

    dayEvents.forEach((event) => {
      const eventStart = event.gridColumnStart;
      const eventEnd = eventStart + event.span - 1;

      // Find the first row where this event can fit
      let rowIndex = 0;
      let foundRow = false;

      while (!foundRow) {
        // Initialize row if it doesn't exist
        if (!rows[rowIndex]) {
          rows[rowIndex] = Array(8).fill(0); // 8 columns (1-indexed to match grid)
        }

        // Check if this row has space for the event
        let hasSpace = true;
        for (let col = eventStart; col <= eventEnd; col++) {
          if (rows[rowIndex][col]) {
            hasSpace = false;
            break;
          }
        }

        if (hasSpace) {
          // Mark columns as occupied
          for (let col = eventStart; col <= eventEnd; col++) {
            rows[rowIndex][col] = 1;
          }

          // Assign row to event (1-indexed for CSS grid)
          event.gridRowStart = rowIndex + 1;
          foundRow = true;
        } else {
          // Try next row
          rowIndex++;
        }
      }
    });

    return dayEvents;
  }, [events, displayWeek, nthuCalendarEvents, showAcademicCalendar]);
  const renderAllDayEvents = useCallback(() => {
    return dayEvents.map((event, index) => (
      <EventPopover key={event.id + event.dispStart.getDate()} event={event}>
        <button
          type="button"
          className="border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            gridColumn: `${event.gridColumnStart} / span ${event.span}`,
            gridRow: event.gridRowStart,
          }}
        >
          <div
            className="overflow-hidden bg-primary rounded-md h-full p-1 sm:p-2 flex flex-col gap-1"
            style={{ background: event.color, color: event.textColor }}
          >
            <div className="text-sm leading-none line-clamp-1">
              {event.title}
            </div>
          </div>
        </button>
      </EventPopover>
    ));
  }, [dayEvents]);

  return (
    <div className="flex flex-row w-full overflow-x-scroll h-full pl-2 md:pl-0">
      <div
        className="flex flex-col min-w-9 sticky left-0 z-20 h-full overflow-y-hidden"
        ref={timeLabelContainer}
        style={{
          paddingTop: headerHeight + 10,
        }}
      >
        {[...hours].splice(1).map((hour, index) => (
          <div key={hour.getTime()} style={{ paddingTop: HOUR_HEIGHT - 16 }}>
            <div className="text-muted-foreground text-xs select-none tabular-nums">
              {format(hour, "HH:mm")}
            </div>
          </div>
        ))}
        <div style={{ paddingTop: HOUR_HEIGHT }}></div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-col  md:min-w-0 w-full">
        <div className="flex flex-col w-full" ref={headerRow}>
          <div className="flex flex-row justify-evenly h-8">
            {displayWeek.map((day, index) => (
              <div
                key={day.getTime()}
                className="flex flex-col flex-1 items-center justify-center h-full select-none"
              >
                <div className="md:hidden text-xs font-semibold">
                  {formatTaipei(day, "EEEEE", { locale: getLocale(language) })}
                </div>
                <div className="hidden md:inline text-xs font-semibold">
                  {formatTaipei(day, "E", { locale: getLocale(language) })}
                </div>
                <div
                  className={cn(
                    "text-muted-foreground text-xs text-center align-baseline",
                    isTaipeiToday(day)
                      ? "rounded-full bg-primary text-primary-foreground aspect-square"
                      : "",
                  )}
                >
                  {formatTaipei(
                    day,
                    isSameTaipeiMonth(day, new Date()) ? "d" : "MMM d",
                    { locale: getLocale(language) },
                  )}
                </div>
              </div>
            ))}
          </div>{" "}
          <div className="flex flex-row justify-evenly">
            <div className="grid grid-cols-7 grid-auto-rows-max gap-1 flex-1">
              {renderAllDayEvents()}
            </div>
          </div>
        </div>
        <Separator orientation="horizontal" />
        <div
          className="w-full flex flex-row overflow-y-auto scrollbar-none"
          onScroll={handleScroll}
          ref={displayContainer}
        >
          <div className="flex flex-row w-full h-max">
            <div className="flex-1 relative h-full">
              <div className="flex flex-row">
                {displayWeek.map((day, index) => (
                  <div key={day.getTime()} className="relative flex-1">
                    <div
                      className="flex flex-col border-r border-border flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      role="button"
                      tabIndex={0}
                      aria-label={dict.calendar.accessibility.create_event_on_date.replace(
                        "{date}",
                        formatTaipei(day, "PPP", {
                          locale: getLocale(language),
                        }),
                      )}
                      onClick={(e) => handleEmptySlotClick(day, e.clientY, e)}
                      onKeyDown={(event) => handleEmptySlotKeyDown(day, event)}
                    >
                      {hours.map((hour, index) => (
                        <div
                          key={hour.getTime()}
                          className="border-b border-border"
                          style={{ height: HOUR_HEIGHT }}
                        ></div>
                      ))}
                    </div>
                    {renderEventsInDay(day)}
                    {renderOverlayEventsInDay(day)}
                  </div>
                ))}
              </div>
              <CurrentTimePointer />
            </div>
          </div>
        </div>

        {/* Event form that opens when clicking on an empty time slot */}
        {newEventTime && (
          <AddEventButton
            openDialog={eventFormOpen}
            onOpenChange={setEventFormOpen}
            defaultEvent={{
              start: newEventTime,
              end: addMinutes(newEventTime, 30),
              allDay: false,
            }}
            returnFocusRef={eventFormTriggerRef}
            onEventAdded={(event) => {
              addEvent(event);
              setNewEventTime(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
