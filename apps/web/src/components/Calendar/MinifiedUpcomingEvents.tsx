import { useQuery } from "@tanstack/react-query";
import { useCalendar } from "@/components/Calendar/calendar_hook";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { EventPopover } from "@/components/Calendar/EventPopover";
import useTime from "@/hooks/useTime";
import { Clock, Calendar } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

const MinifiedUpcomingEvents = () => {
  const { events } = useCalendar();
  const today = useTime();
  const end = addDays(today, 14); // Look ahead for two weeks
  const dict = useDictionary();

  const upcomingEvents = eventsToDisplay(events, today, end)
    .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime())
    .slice(0, 3); // Only show the next 3 events

  if (upcomingEvents.length === 0) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        {dict.calendar.minified.no_events}
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-xs font-semibold mb-1">
        {dict.calendar.upcoming_events}
      </div>
      <div className="flex flex-col gap-1">
        {upcomingEvents.map((event, index) => (
          <EventPopover event={event} key={event.id + index}>
            <div className="flex items-center gap-1 text-xs">
              <div
                className="size-2 rounded-sm shrink-0"
                style={{ backgroundColor: event.color }}
              ></div>
              <div className="flex-1 truncate">{event.title}</div>
              <div className="text-muted-foreground whitespace-nowrap">
                {!isToday(event.displayStart) && (
                  <>
                    <Calendar className="size-3 inline mr-[2px]" />
                    {format(event.displayStart, "MM/dd")}
                  </>
                )}
                <Clock className="size-3 inline ml-1 mr-[2px]" />
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
