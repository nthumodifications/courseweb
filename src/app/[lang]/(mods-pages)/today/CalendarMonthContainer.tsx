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
import { eventsToDisplay } from "@/app/[lang]/(mods-pages)/today/calendar_utils";
import { adjustLuminance, getBrightness } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import { useEventCallback, useMediaQuery } from "usehooks-ts";
import { useCallback } from "react";

export const CalendarMonthContainer = ({
  displayMonth,
  onChangeView,
}: {
  displayMonth: Date[];
  onChangeView: (view: "week", date: Date) => void;
}) => {
  const { events } = useCalendar();
  const isScreenMD = useMediaQuery("(min-width: 768px)");
  const rows_length = Math.ceil(displayMonth.length / 7);

  const renderEventsInDay = useCallback(
    (day: Date, padding: number) => {
      const dayEvents = eventsToDisplay(events, startOfDay(day), endOfDay(day))
        .filter((e) => !e.allDay)
        .map((event) => {
          // Determine the text color
          const brightness = getBrightness(event.color);
          // From the brightness, using the adjustBrightness function, create a complementary color that is legible
          const textColor = adjustLuminance(
            event.color,
            brightness > 186 ? 0.2 : 0.95,
          );
          return { ...event, textColor };
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
          {dayEvents.map((event, index) => (
            <EventPopover key={index} event={event}>
              <div
                className="bg-nthu-500 rounded-md p-0.5 md:p-1 flex flex-row gap-1 items-center hover:shadow-md cursor-pointer transition-shadow select-none"
                style={{ background: event.color, color: event.textColor }}
              >
                <div className="hidden md:inline text-[10px] font-normal leading-none">
                  {format(event.displayStart, "HH:mm")}
                </div>
                <div className="text-xs leading-none whitespace-nowrap overflow-hidden">
                  {event.title}
                </div>
              </div>
            </EventPopover>
          ))}
        </div>
      );
    },
    [events, isScreenMD],
  );

  const renderAllDayEvents = useCallback(
    (start: Date, end: Date) => {
      const allDayEvents = eventsToDisplay(
        events,
        startOfDay(start),
        endOfDay(end),
      )
        .filter((e) => e.allDay)
        .map((event) => {
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
            differenceInDays(endOfDay(snippetEnd), startOfDay(snippetStart)) +
              1,
            7 - getDay(snippetStart) + 1,
          );
          const left = (100 / 7) * getDay(snippetStart);
          const width = (100 / 7) * span;
          return { ...event, textColor, left, width };
        });

      return allDayEvents.map((event, index) => (
        <EventPopover key={index} event={event}>
          <div
            style={{
              position: "absolute",
              top: 33 + index * (isScreenMD ? 22 : 18),
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
    [events, isScreenMD],
  );

  const renderRow = useCallback(
    (day: Date, colIndex: number) => {
      //check for any allday events that exists in the day
      const allDayEvents = events.filter(
        (e) => e.allDay && (isSameWeek(day, e.start) || isSameWeek(day, e.end)),
      );

      return (
        <div
          key={day.getTime()}
          className={cn(
            "flex flex-col gap-1 min-h-[120px] border-t border-l border-slate-200 last:border-b last:border-r",
            isSameMonth(day, displayMonth[15]) ? "" : "bg-slate-50",
          )}
        >
          <div
            className={cn(
              "text-sm font-semibold cursor-pointer p-0.5",
              isToday(day)
                ? "w-6 h-6 rounded-full bg-nthu-500 text-white flex items-center justify-center"
                : "text-slate-900",
            )}
            onClick={() => onChangeView("week", day)}
          >
            {format(day, "d")}
          </div>
          {renderAllDayEvents(startOfWeek(day), endOfWeek(day))}
          {renderEventsInDay(day, allDayEvents.length)}
        </div>
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
