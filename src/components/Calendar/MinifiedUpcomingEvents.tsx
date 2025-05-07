"use client";
import { useQuery } from "@tanstack/react-query";
import { useCalendar } from "@/components/Calendar/calendar_hook";
import { addDays, format, isSameDay } from "date-fns";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { EventPopover } from "@/components/Calendar/EventPopover";
import useTime from "@/hooks/useTime";
import { Clock } from "lucide-react";

const MinifiedUpcomingEvents = () => {
  const { events } = useCalendar();
  const today = useTime();
  const end = addDays(today, 1);

  const upcomingEvents = eventsToDisplay(events, today, end)
    .filter((event) => isSameDay(event.displayStart, today))
    .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime())
    .slice(0, 3); // Only show the next 3 events

  if (upcomingEvents.length === 0) {
    return (
      <div className="p-2 text-xs text-muted-foreground">今天沒有行程</div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-xs font-semibold mb-1">今日行程</div>
      <div className="flex flex-col gap-1">
        {upcomingEvents.map((event, index) => (
          <EventPopover event={event} key={event.id + index}>
            <div className="flex items-center gap-1 text-xs">
              <div
                className="size-2 rounded-sm shrink-0"
                style={{ backgroundColor: event.color }}
              ></div>
              <div className="flex-1 truncate">{event.title}</div>
              <div className="text-muted-foreground">
                <Clock className="size-3 inline mr-[2px]" />
                {format(event.displayStart, "HH:mm")}
              </div>
            </div>
          </EventPopover>
        ))}
      </div>
    </div>
  );
};

export default MinifiedUpcomingEvents;
