import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";

const MinifiedUpcomingEvents = () => {
  const dict = useDictionary();
  const { events } = useUpcomingEvents();

  if (events.length === 0) return null;

  return (
    <div className="p-2">
      <div className="mb-1 text-xs font-medium">
        {dict.calendar.upcoming_events}
      </div>
      <UpcomingEventList
        events={events}
        compact
        maxEvents={3}
        showDayGroups={false}
      />
    </div>
  );
};

export default MinifiedUpcomingEvents;
