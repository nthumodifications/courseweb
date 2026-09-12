import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";
import { Section } from "@courseweb/ui";

const MinifiedUpcomingEvents = () => {
  const dict = useDictionary();
  const { events } = useUpcomingEvents();

  return (
    <Section title={dict.calendar.upcoming_events}>
      <UpcomingEventList
        events={events}
        compact
        maxEvents={3}
        showDayGroups={false}
        emptyStateSize="sm"
      />
    </Section>
  );
};

export default MinifiedUpcomingEvents;
