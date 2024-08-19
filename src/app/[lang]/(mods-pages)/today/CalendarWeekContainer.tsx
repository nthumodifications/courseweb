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
import { eventsToDisplay } from "@/app/[lang]/(mods-pages)/today/calendar_utils";
import { adjustLuminance, getBrightness } from "@/helpers/colors";
import { EventPopover } from "./EventPopover";
import { UIEventHandler, useCallback, useRef } from "react";

export const CalendarWeekContainer = ({
  displayWeek,
}: {
  displayWeek: Date[];
}) => {
  const { events, addEvent, displayContainer, HOUR_HEIGHT } = useCalendar();
  console.log(HOUR_HEIGHT);

  const hours = eachHourOfInterval({
    start: new Date(2024, 2, 3, 0),
    end: new Date(2024, 2, 3, 23),
  });

  const timeLabelContainer = useRef<HTMLDivElement>(null);
  const displayContainerRef = useRef<HTMLDivElement>(null);

  // Sync displayContainer scroll with timeLabelContainer
  const handleScroll: UIEventHandler<HTMLDivElement> = (e) => {
    console.log(e.currentTarget.scrollTop);
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
      return dayEvents.map((event, index) => (
        <EventPopover key={index} event={event}>
          <div
            className="absolute left-0 w-full pr-1 "
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
            }}
          >
            <div
              className="bg-nthu-500 rounded-md h-full p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none"
              style={{ background: event.color, color: event.textColor }}
            >
              <div className="text-sm leading-none">{event.title}</div>
              <div className="text-xs font-normal leading-none">
                {format(event.displayStart, "HH:mm")} -{" "}
                {format(event.displayEnd, "HH:mm")}
              </div>
            </div>
          </div>
        </EventPopover>
      ));
    },
    [events, HOUR_HEIGHT],
  );

  const renderAllDayEvents = useCallback(() => {
    const dayEvents = eventsToDisplay(
      events,
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
        const span =
          differenceInDays(
            endOfDay(event.displayEnd),
            startOfDay(event.displayStart),
          ) + 1;
        const gridColumnStart =
          differenceInDays(event.displayStart, displayWeek[0]) + 1;
        return { ...event, textColor, span, gridColumnStart };
      });

    return dayEvents.map((event, index) => (
      <EventPopover key={index} event={event}>
        <div
          style={{
            gridColumn: `span ${event.span} / span ${event.span}`,
            gridColumnStart: event.gridColumnStart,
          }}
        >
          <div
            className="bg-nthu-500 rounded-md h-full p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow select-none"
            style={{ background: event.color, color: event.textColor }}
          >
            <div className="text-sm leading-none">{event.title}</div>
          </div>
        </div>
      </EventPopover>
    ));
  }, [events, displayWeek]);

  return (
    <div className="flex flex-row w-full overflow-x-scroll h-full">
      <div
        className="flex flex-col min-w-12 sticky left-0 pr-2 bg-white shadow-md z-20 h-full overflow-y-hidden pt-16"
        ref={timeLabelContainer}
      >
        {[...hours].splice(1).map((hour, index) => (
          <div key={hour.getTime()} style={{ paddingTop: HOUR_HEIGHT - 20 }}>
            <div className="text-slate-500 text-sm select-none">
              {format(hour, "HH:mm")}
            </div>
          </div>
        ))}
        <div style={{ paddingTop: HOUR_HEIGHT }}></div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-col min-w-[580px] md:min-w-0 w-full">
        <div className="flex flex-row justify-evenly h-16">
          {displayWeek.map((day, index) => (
            <div
              key={day.getTime()}
              className="flex flex-col flex-1 items-center justify-center h-full select-none"
            >
              <div className="text-slate-900 text-lg font-semibold">
                {format(day, "E")}
              </div>
              <div
                className={cn(
                  "text-slate-500 text-sm text-center align-baseline",
                  isToday(day)
                    ? "w-6 h-6 rounded-full bg-nthu-500 text-white"
                    : "",
                )}
              >
                {format(day, isSameMonth(day, new Date()) ? "d" : "MMM d")}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-row justify-evenly">
          <div className="grid grid-cols-7 flex-1">{renderAllDayEvents()}</div>
        </div>
        <Separator orientation="horizontal" />
        <div
          className="w-full flex flex-row overflow-y-auto scrollbar-none"
          onScroll={handleScroll}
        >
          <div className="flex flex-row w-full h-max">
            <div className="flex-1 relative h-full">
              <div className="flex flex-row">
                {displayWeek.map((day, index) => (
                  <div key={day.getTime()} className="relative flex-1">
                    <div className="flex flex-col border-r border-slate-200 flex-1">
                      {hours.map((hour, index) => (
                        <div
                          key={hour.getTime()}
                          className="border-b border-slate-200"
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
