"use client";
import { NextPage } from "next";
import { useQuery } from "@tanstack/react-query";
import { WeatherData } from "@/types/weather";
import { AlertDefinition } from "@/config/supabase";
import Calendar from "./Calendar";
import { useCalendar } from "./calendar_hook";
import { addDays, isSameDay, eachDayOfInterval, format } from "date-fns";
import { getBrightness } from "@/helpers/colors";
import { adjustLuminance } from "@/helpers/colors";
import { eventsToDisplay } from "./calendar_utils";
import { EventPopover } from "./EventPopover";
const UpcomingEvents = () => {
  const { events } = useCalendar();

  const today = new Date();
  const end = addDays(today, 7);
  const upcomingEvents = eventsToDisplay(events, today, end).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const uniqueLabels = Array.from(new Set(upcomingEvents.map((e) => e.tag)));
  const labelsCount = uniqueLabels.map(
    (label) => upcomingEvents.filter((e) => e.tag == label).length,
  );

  const renderLabelEvents = (label: string) => {
    const ev = upcomingEvents.filter((e) => e.tag == label);
    return ev.slice(0, 3).map((event, index) => {
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
            className="self-stretch px-2 pt-2 pb-6 rounded flex-col justify-start items-start gap-2 flex"
            style={{ background: event.color, color: textColor }}
          >
            <div className="text-sm font-medium font-['Inter'] leading-none">
              {event.title}
            </div>
            <div className="justify-start items-start gap-1 inline-flex">
              <div className="text-xs font-normal font-['Inter'] leading-none">
                {format(event.displayStart, "yyyy LL d")}
              </div>
              <div className="text-xs font-normal font-['Inter'] leading-none">
                {format(event.displayStart, "HH:mm")} -{" "}
                {format(event.displayEnd, "HH:mm")}
              </div>
            </div>
            <div className="text-slate-500 text-xs font-normal font-['Inter'] leading-none">
              {event.details}
            </div>
          </div>
        </EventPopover>
      );
    });
  };

  return (
    <div className="flex-col justify-start items-start gap-2 inline-flex md:min-w-[292px] md:h-full">
      <div className="self-stretch text-slate-900 text-lg font-semibold font-['Inter'] leading-7">
        即將到來的行程
      </div>
      <div className="self-stretch p-4 bg-slate-50 rounded-lg flex-col justify-start items-start gap-6 flex">
        <div className="self-stretch justify-start items-start gap-6 inline-flex flex-col sm:flex-row md:flex-col">
          {uniqueLabels.map((label, index) => (
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex">
              <div className="self-stretch h-10 justify-start items-center gap-2 inline-flex">
                <div className="grow shrink basis-0 text-slate-900 text-lg font-semibold font-['Inter'] leading-7 capitalize">
                  {label}
                </div>
                {labelsCount[index] > 3 && (
                  <div className="px-4 py-2 bg-white bg-opacity-0 rounded-md justify-center items-center gap-2.5 flex">
                    <div className="text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                      查看全部
                    </div>
                  </div>
                )}
              </div>
              {renderLabelEvents(label)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TodayPage: NextPage = () => {
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
    data: alerts = [],
    error: alertError,
    isError: alertLoading,
  } = useQuery<AlertDefinition[]>({
    queryKey: ["alert"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/alert");
      const data = await res.json();
      return data;
    },
  });

  return (
    <div className="px-4 md:pr-8 w-full h-[--content-height] overflow-y-hidden">
      <div className="flex flex-row-reverse gap-6 h-full">
        <Calendar />
        <div className="hidden xl:inline">
          <UpcomingEvents />
        </div>
      </div>
    </div>
  );
};

export default TodayPage;
