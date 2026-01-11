import {
  differenceInDays,
  eachHourOfInterval,
  endOfDay,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  set,
  addMinutes,
} from "date-fns";
import { cn } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { useCalendar } from "./calendar_hook";
import { CurrentTimePointer } from "./CurrentTimePointer";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { getContrastColor, getBrightness } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import {
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEventInternal } from "./calendar.types";
import { useSettings } from "@/hooks/contexts/settings";
import client from "@/config/api";
import { AddEventButton } from "./AddEventButton";
import { getNearestTime } from "@courseweb/ui";

export const CalendarWeekContainer = ({
  displayWeek,
}: {
  displayWeek: Date[];
}) => {
  const { events, addEvent, displayContainer, HOUR_HEIGHT } = useCalendar();
  const { showAcademicCalendar } = useSettings();
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [newEventTime, setNewEventTime] = useState<Date | null>(null);

  // Function to handle clicks on empty time slots
  const handleEmptySlotClick = useCallback(
    (day: Date, clientY: number, e: React.MouseEvent) => {
      // Don't open form if clicked on an existing event
      if ((e.target as HTMLElement).closest(".event-item")) {
        return;
      }

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
      const clickedTime = set(day, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });

      // Round to nearest 10 minutes
      const roundedTime = getNearestTime(clickedTime, 10);
      const newTime = set(clickedTime, {
        hours: roundedTime.hours,
        minutes: roundedTime.minutes,
      });

      setNewEventTime(newTime);
      setEventFormOpen(true);
    },
    [displayContainer, HOUR_HEIGHT],
  );

  const {
    data: nthuCalendarEvents = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<CalendarEventInternal[]>({
    queryKey: [
      "event",
      format(displayWeek[0], "yyyy-MM-dd"),
      format(displayWeek[6], "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const res = await client.acacalendar.$get({
        query: {
          start: displayWeek[0].toISOString(),
          end: displayWeek[6].toISOString(),
        },
      });
      const nthuEvents = await res.json();
      return nthuEvents.map((event, index) => {
        return {
          id: "nthu-" + event.id,
          title: event.summary,
          start: startOfDay(new Date(event.date)),
          end: endOfDay(new Date(event.date)),
          isAllDay: true,
          color: "#A973D9",
          tag: "NTHU",
          actualEnd: endOfDay(new Date(event.date)),
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
      const dayEvents = eventsToDisplay(events, startOfDay(day), endOfDay(day))
        .filter((e) => {
          return !e.isAllDay;
        })
        .map((event) => {
          //Determine the text color
          const brightness = getBrightness(event.color);
          //From the brightness, using the getContrastColor function, create a complementary color that is legible
          const textColor = getContrastColor(event.color);
          return { ...event, textColor };
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
      });

      return groupedEvents.map((group, groupIndex) =>
        group.map((event, index) => (
          <EventPopover key={index} event={event}>
            <div
              className="absolute left-0 w-full pr-0.5 "
              style={{
                top:
                  event.displayStart.getHours() * HOUR_HEIGHT +
                  (event.displayStart.getMinutes() * HOUR_HEIGHT) / 60,
                height:
                  (event.displayEnd.getHours() -
                    event.displayStart.getHours()) *
                    HOUR_HEIGHT +
                  ((event.displayEnd.getMinutes() -
                    event.displayStart.getMinutes()) *
                    HOUR_HEIGHT) /
                    60,
                width: `calc(${100 / group.length}% - 2px)`,
                left: `calc(${(100 / group.length) * index}% + 1px)`,
              }}
            >
              <div
                className="overflow-hidden bg-nthu-500 rounded-md h-full p-1 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none"
                style={{ background: event.color, color: event.textColor }}
              >
                <div className="text-xs leading-none">{event.title}</div>
                <div className="text-xs font-normal leading-none">
                  {format(event.displayStart, "HH:mm")} -{" "}
                  {format(event.displayEnd, "HH:mm")}
                </div>
                {event.location && (
                  <div className="text-xs leading-none">{event.location}</div>
                )}
              </div>
            </div>
          </EventPopover>
        )),
      );
    },
    [events, HOUR_HEIGHT],
  );
  const dayEvents = useMemo(() => {
    // Step 1: Prepare events with display information
    const dayEvents = eventsToDisplay(
      showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
      startOfDay(displayWeek[0]),
      endOfDay(displayWeek[6]),
    )
      .filter((e) => {
        return e.isAllDay;
      })
      .map((event) => {
        //Determine the text color
        const brightness = getBrightness(event.color);
        //From the brightness, using the getContrastColor function, create a complementary color that is legible
        const textColor = getContrastColor(event.color);
        let span =
          differenceInDays(
            endOfDay(event.displayEnd),
            startOfDay(event.displayStart),
          ) + 1;
        // get start date wrt to this week
        const dispStart =
          differenceInDays(event.displayStart, displayWeek[0]) > 0
            ? event.displayStart
            : displayWeek[0];
        // Calculate which column this event starts at
        let gridColumnStart: number = 1; // Start with 1 as grid columns are 1-indexed
        if (differenceInDays(event.displayStart, displayWeek[0]) > 0)
          gridColumnStart =
            differenceInDays(event.displayStart, displayWeek[0]) + 1;
        else {
          gridColumnStart = 1; // Events starting before the week start at column 1
          span = differenceInDays(event.displayEnd, displayWeek[0]) + 1;
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
        <div
          style={{
            gridColumn: `${event.gridColumnStart} / span ${event.span}`,
            gridRow: event.gridRowStart,
          }}
        >
          <div
            className="overflow-hidden bg-nthu-500 rounded-md h-full p-1 sm:p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none"
            style={{ background: event.color, color: event.textColor }}
          >
            <div className="text-sm leading-none line-clamp-1">
              {event.title}
            </div>
          </div>
        </div>
      </EventPopover>
    ));
  }, [dayEvents]);

  return (
    <div className="flex flex-row w-full overflow-x-scroll h-full pl-2 md:pl-0">
      <div
        className="flex flex-col min-w-9 sticky left-0 shadow-md z-20 h-full overflow-y-hidden"
        ref={timeLabelContainer}
        style={{
          paddingTop: headerHeight + 10,
        }}
      >
        {[...hours].splice(1).map((hour, index) => (
          <div key={hour.getTime()} style={{ paddingTop: HOUR_HEIGHT - 16 }}>
            <div className="text-slate-500 text-xs select-none">
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
                  {format(day, "EEEEE")}
                </div>
                <div className="hidden md:inline text-xs font-semibold">
                  {format(day, "E")}
                </div>
                <div
                  className={cn(
                    "text-slate-500 text-xs text-center align-baseline",
                    isToday(day)
                      ? "rounded-full bg-nthu-500 text-white aspect-square"
                      : "",
                  )}
                >
                  {format(day, isSameMonth(day, new Date()) ? "d" : "MMM d")}
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
                      className="flex flex-col border-r border-border flex-1"
                      onClick={(e) => handleEmptySlotClick(day, e.clientY, e)}
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
              isAllDay: false,
            }}
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
