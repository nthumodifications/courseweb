import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";

const MinifiedUpcomingEvents = () => {
  const dict = useDictionary();
  const { events } = useUpcomingEvents();
  const nonCourseEvents = events.filter((event) => event.source !== "class");

  if (nonCourseEvents.length === 0) return null;

  return (
    <div className="p-2">
      <div className="mb-1 text-xs font-medium">
        {dict.calendar.upcoming_events}
      </div>
      <UpcomingEventList
        events={nonCourseEvents}
        compact
        maxEvents={3}
        showDayGroups={false}
      />
    </div>
  );
};

export default MinifiedUpcomingEvents;
