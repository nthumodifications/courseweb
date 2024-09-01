import { useQuery } from "@tanstack/react-query";
import { WeatherData } from "@/types/weather";
import { getBrightness, adjustLuminance } from "@/helpers/colors";
import { EventData } from "@/types/calendar_event";
import { useCalendar } from "@/components/Calendar/calendar_hook";
import { addDays, format, formatRelative, isSameDay, parse } from "date-fns";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { EventPopover } from "@/components/Calendar/EventPopover";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import WeatherIcon from "@/components/Today/WeatherIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNTHUCalendar } from "@/lib/calendar_event";
const UpcomingEvents = () => {
  const { events } = useCalendar();
  const { language } = useSettings();
  const today = useTime();
  const end = addDays(today, 5);
  const days = [today, ...[1, 2, 3, 4].map((i) => addDays(today, i))];

  const {
    data: weatherData,
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
    data: calendarData = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<EventData[]>({
    queryKey: ["event", format(today, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")],
    queryFn: async () => {
      return getNTHUCalendar(today, end);
    },
  });

  const upcomingEvents = eventsToDisplay(events, today, end).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const renderLabelEvents = (date: Date) => {
    const ev = upcomingEvents
      .filter((event) => isSameDay(event.start, date))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    return ev.map((event, index) => {
      //Determine the text color
      const brightness = getBrightness(event.color);
      //From the brightness, using the adjustBrightness function, create a complementary color that is legible
      const textColor = adjustLuminance(
        event.color,
        brightness > 186 ? 0.2 : 0.95,
      );
      return (
        <EventPopover event={event} key={event.id}>
          <div
            className="self-stretch px-2 pt-2 pb-6 rounded-md flex-col justify-start items-start gap-2 flex"
            style={{ background: event.color, color: textColor }}
          >
            <div className="text-sm font-semibold  leading-none">
              {event.title}
            </div>
            <div className="justify-start items-start gap-1 inline-flex">
              <div className="text-xs font-normal  leading-none">
                {format(event.displayStart, "yyyy-LL-d")}
              </div>
              <div className="text-xs font-normal leading-none">
                {format(event.displayStart, "HH:mm")} -{" "}
                {format(event.displayEnd, "HH:mm")}
              </div>
            </div>

            <div className="text-xs font-normal">{event.location}</div>
            <div className="text-xs font-normal">{event.details}</div>
          </div>
        </EventPopover>
      );
    });
  };

  const renderCalendars = (day: Date) => {
    const events = (calendarData ?? []).filter((event) =>
      isSameDay(parse(event.date, "yyyy-MM-dd", new Date()), day),
    );
    return (
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
    <div className="flex-col justify-start items-start gap-2 inline-flex md:max-w-[292px] md:h-full">
      <div className="self-stretch text-lg font-semibold  leading-7">
        即將到來的行程
      </div>
      <div className="self-stretch p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex-col justify-start items-start gap-6 flex">
        {days.map((day) => (
          <div
            className="flex flex-col gap-2 pb-4 w-full"
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
                  {format(day, "EEEE, do MMMM", {
                    locale: getLocale(language),
                  })}
                </div>
              </div>
              {!weatherLoading && weatherData && (
                <WeatherIcon
                  date={day}
                  weather={
                    weatherData!.find(
                      (w) => w.date == format(day, "yyyy-MM-dd"),
                    )!
                  }
                />
              )}
            </div>
            {renderCalendars(day)}
            {renderLabelEvents(day)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;
