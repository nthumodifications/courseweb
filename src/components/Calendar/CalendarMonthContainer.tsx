import {
  differenceInDays,
  endOfDay,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isSameWeek,
  isToday,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useCalendar } from "./calendar_hook";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { adjustLuminance, getBrightness } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import { useEventCallback, useMediaQuery } from "usehooks-ts";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNTHUCalendar } from "@/lib/calendar_event";
import { CalendarEventInternal } from "@/components/Calendar/calendar.types";
import { useSettings } from "@/hooks/contexts/settings";

export const CalendarMonthContainer = ({
  displayMonth,
  onChangeView,
}: {
  displayMonth: Date[];
  onChangeView: (view: "week", date: Date) => void;
}) => {
  const { events } = useCalendar();
  const { showAcademicCalendar } = useSettings();

  const isScreenMD = useMediaQuery("(min-width: 768px)");
  const rows_length = Math.ceil(displayMonth.length / 7);
  const {
    data: nthuCalendarEvents = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<CalendarEventInternal[]>({
    queryKey: [
      "event",
      format(displayMonth[0], "yyyy-MM-dd"),
      format(displayMonth[displayMonth.length - 1], "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const nthuEvents = await getNTHUCalendar(
        displayMonth[0],
        displayMonth[displayMonth.length - 1],
      );
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

  const renderEventsInDay = useCallback(
    (day: Date, padding: number) => {
      const dayEvents = eventsToDisplay(
        events,
        startOfDay(day),
        endOfDay(day),
      ).map((event) => {
        // Determine the text color
        const brightness = getBrightness(event.color);
        // From the brightness, using the adjustBrightness function, create a complementary color that is legible
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

      return (
        <div className="flex flex-col gap-0.5 mt-1" key={day.getTime()}>
          {Array(padding)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="w-full"
                style={{ height: isScreenMD ? 20 : 16 }}
              ></div>
            ))}
          {groupedEvents.map((group, groupIndex) =>
            group.map((event, index) => (
              <EventPopover key={index} event={event}>
                <div
                  className="bg-nthu-500 rounded-md p-0.5 md:p-1 flex flex-row gap-1 items-center hover:shadow-md cursor-pointer transition-shadow select-none"
                  style={{
                    background: event.color,
                    color: event.textColor,
                    height: isScreenMD ? 20 : 16,
                    width: `calc(${100 / group.length}% - 2px)`,
                    left: `calc(${(100 / group.length) * index}% + 1px)`,
                  }}
                >
                  <div className="hidden md:inline text-[10px] font-normal leading-none">
                    {format(event.displayStart, "HH:mm")}
                  </div>
                  <div className="text-xs leading-none whitespace-nowrap overflow-hidden">
                    {event.title}
                  </div>
                </div>
              </EventPopover>
            )),
          )}
        </div>
      );
    },
    [events, isScreenMD],
  );

  const renderAllDayEvents = useCallback(
    (start: Date, end: Date) => {
      const filteredEvents = eventsToDisplay(
        showAcademicCalendar ? [...nthuCalendarEvents, ...events] : events,
        startOfDay(start),
        endOfDay(end),
      ).filter((e) => e.allDay);

      const allDayEvents = filteredEvents.map((event) => {
        // Snap the event to the start if it starts before the start of the week
        const snippetStart = isSameWeek(start, event.start)
          ? event.start
          : startOfDay(start);
        // Snap the event to the end if it ends after the end of the week
        const snippetEnd = isSameWeek(end, event.end)
          ? event.end
          : endOfDay(end);
        // Determine the text color
        const brightness = getBrightness(event.color);
        // From the brightness, using the adjustBrightness function, create a complementary color that is legible
        const textColor = adjustLuminance(
          event.color,
          brightness > 186 ? 0.2 : 0.95,
        );
        const span = Math.min(
          differenceInDays(endOfDay(snippetEnd), startOfDay(snippetStart)) + 1,
          7 - getDay(snippetStart) + 1,
        );
        const left = (100 / 7) * getDay(snippetStart);
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
          <div
            style={{
              position: "absolute",
              top: `${event.top}px`,
              left: `calc(${event.left}%)`,
              width: `calc(${event.width}%)`,
            }}
          >
            <div
              className="bg-nthu-500 rounded-md p-0.5 md:p-1 flex flex-row gap-1 items-center hover:shadow-md cursor-pointer transition-shadow select-none"
              style={{ background: event.color, color: event.textColor }}
            >
              <div className="text-xs leading-none whitespace-nowrap overflow-hidden">
                {event.title}
              </div>
            </div>
          </div>
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
        startOfDay(day),
        endOfDay(day),
      ).filter((e) => e.allDay);

      return (
        <>
          {getDay(day) == 0 &&
            renderAllDayEvents(startOfWeek(day), endOfWeek(day))}
          <div
            key={day.getTime()}
            className={cn(
              "flex flex-col gap-1 min-h-[120px] border-t border-l border-border last:border-b last:border-r",
              isSameMonth(day, displayMonth[15]) ? "" : "bg-black/15",
            )}
          >
            <div
              className={cn(
                "text-sm font-semibold cursor-pointer p-0.5",
                isToday(day)
                  ? "w-6 h-6 rounded-full bg-nthu-500 text-white flex items-center justify-center"
                  : "",
              )}
              onClick={() => onChangeView("week", day)}
            >
              {format(day, "d")}
            </div>
            {renderEventsInDay(day, allDayEvents.length)}
          </div>
        </>
      );
    },
    [events, displayMonth, renderAllDayEvents, renderEventsInDay, onChangeView],
  );

  return (
    <div className="overflow-x-auto flex-1">
      <div className="flex flex-col md:min-w-0 h-full">
        <div className="grid grid-cols-7 gap-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day, index) => (
              <div
                key={index}
                className="text-slate-500 text-sm font-semibold text-center"
              >
                {day}
              </div>
            ),
          )}
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
