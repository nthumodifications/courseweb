import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";

interface UpcomingEventsWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const UpcomingEventsWidget: FC<UpcomingEventsWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language, showAcademicCalendar } = useSettings();
  const { events, isLoading, error } = useUpcomingEvents();
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.source !== "class" &&
          (event.source !== "academic" || showAcademicCalendar),
      ),
    [events, showAcademicCalendar],
  );
  const title =
    dict.settings.calendar.widget_dashboard.widget_options["upcoming-events"]
      .title;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Calendar className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Calendar className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.today.upcoming.no_events}</span>
          </div>
        ) : (
          <UpcomingEventList events={events} compact maxEvents={5} />
        )}
        <Link
          to={`/${language}/calendar`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default UpcomingEventsWidget;
