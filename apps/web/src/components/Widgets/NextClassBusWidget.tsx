import { type FC } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";
import CampusBusSuggestion from "@/components/Today/CampusBusSuggestion";
import { WidgetShell } from "./WidgetShell";

interface NextClassBusWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const NextClassBusWidget: FC<NextClassBusWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { events } = useUpcomingEvents({ includePast: true });

  return (
    <WidgetShell
      title={
        dict.settings.calendar.widget_dashboard.widget_options["next-class-bus"]
          .title
      }
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <CampusBusSuggestion
        events={events}
        className="px-4"
        emptyState={
          <div className="px-4 py-2 text-sm text-muted-foreground">
            {dict.bus.no_next_class_suggestion}
          </div>
        }
      />
    </WidgetShell>
  );
};

export default NextClassBusWidget;
