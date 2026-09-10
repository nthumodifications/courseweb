import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";

const MinifiedUpcomingEvents = () => {
  const dict = useDictionary();
  const { events } = useUpcomingEvents({ windowDays: 14 });

  return (
    <div className="p-2">
      <div className="text-xs font-semibold mb-1">
        {dict.calendar.upcoming_events}
      </div>
      <UpcomingEventList
        events={events}
        compact
        maxEvents={3}
        showDayGroups={false}
        emptyContent={dict.calendar.minified.no_events}
      />
    </div>
  );
};

export default MinifiedUpcomingEvents;
