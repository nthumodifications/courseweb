import { type FC } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import TimetableAgenda from "@/components/Today/TimetableAgenda";
import { WidgetShell } from "./WidgetShell";

interface WeekAgendaWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const WeekAgendaWidget: FC<WeekAgendaWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();

  return (
    <WidgetShell
      title={
        dict.settings.calendar.widget_dashboard.widget_options["week-agenda"]
          .title
      }
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <TimetableAgenda days={5} />
    </WidgetShell>
  );
};

export default WeekAgendaWidget;
