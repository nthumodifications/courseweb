import {
  differenceInDays,
  eachHourOfInterval,
  endOfDay,
  format,
  isSameMonth,
  isToday,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useCalendar } from "./calendar_hook";
import { CurrentTimePointer } from "./CurrentTimePointer";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { adjustLuminance, getBrightness } from "@/helpers/colors";
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
import { EventData } from "@/types/calendar_event";
import { getNTHUCalendar } from "@/lib/calendar_event";
import { CalendarEventInternal } from "./calendar.types";
import { useSettings } from "@/hooks/contexts/settings";

export const CalendarWeekContainer = ({
  displayWeek,
}: {
  displayWeek: Date[];
}) => {
  const { events, addEvent, displayContainer, HOUR_HEIGHT } = useCalendar();
  const { showAcademicCalendar } = useSettings();
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
      const nthuEvents = await getNTHUCalendar(displayWeek[0], displayWeek[6]);
      return nthuEvents.map((event, index) => {
        return {
          id: "nthu-" + event.id,
          title: event.summary,
          start: startOfDay(new Date(event.date)),
          end: endOfDay(new Date(event.date)),
          allDay: true,
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
          return !e.allDay;
        })
        .map((event) => {
          //Determine the text color
          const brightness = getBrightness(event.color);
          //From the brightness, using the adjustBrightness function, create a complementary color that is legible
          const textColor = adjustLuminance(
            event.color,
            brightness > 186 ? 0.2 : 0.95,
          );
          return { ...event, textColor };
        });

      // Group overlapping events
      const groupedEvents: typeof dayEvents[] = [];
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
                  (event.displayEnd.getHours() - event.displayStart.getHours()) *
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
    const dayEvents = eventsToDisplay(
      showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
      startOfDay(displayWeek[0]),
      endOfDay(displayWeek[6]),
    )
      .filter((e) => {
        return e.allDay;
      })
      .map((event) => {
        //Determine the text color
        const brightness = getBrightness(event.color);
        //From the brightness, using the adjustBrightness function, create a complementary color that is legible
        const textColor = adjustLuminance(
          event.color,
          brightness > 186 ? 0.2 : 0.95,
        );
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

        let gridColumnStart: number = 0;
        if (differenceInDays(event.displayStart, displayWeek[0]) > 0)
          gridColumnStart =
            differenceInDays(event.displayStart, displayWeek[0]) + 1;
        else {
          gridColumnStart = 0;
          span = differenceInDays(event.displayEnd, displayWeek[0]) + 1;
        }
        if (span > 7) {
          span = 7;
        }

        return { ...event, textColor, span, gridColumnStart, dispStart };
      })
      .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime());
    return dayEvents;
  }, [events, displayWeek, nthuCalendarEvents, showAcademicCalendar]);

  const renderAllDayEvents = useCallback(() => {
    return dayEvents.map((event, index) => (
      <EventPopover key={event.id + event.dispStart.getDate()} event={event}>
        <div
          style={{
            gridColumn: `span ${event.span} / span ${event.span}`,
            gridColumnStart: event.gridColumnStart,
          }}
        >
          <div
            className=" overflow-hidden bg-nthu-500 rounded-md h-full p-1 sm:p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none"
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
    <div className="flex flex-row w-full overflow-x-scroll h-full">
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
          </div>
          <div className="flex flex-row justify-evenly">
            <div className="grid grid-cols-7 flex-1">
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
                    <div className="flex flex-col border-r border-border flex-1">
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
      </div>
    </div>
  );
};
