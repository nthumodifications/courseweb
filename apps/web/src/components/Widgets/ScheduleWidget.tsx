import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import useTime from "@/hooks/useTime";
import { Calendar } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import useDictionary from "@/dictionaries/useDictionary";
import { EmptyState } from "@courseweb/ui";
import useUpcomingEvents, {
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
} from "@/hooks/useUpcomingEvents";

interface ScheduleWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const ScheduleWidget: FC<ScheduleWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const date = useTime();
  const dict = useDictionary();
  const { events } = useUpcomingEvents({ includePast: true });

  const todayCourses = useMemo(
    () =>
      events.filter(
        (event) =>
          event.source === "class" &&
          getTaipeiDateKey(event.start) === getTaipeiDateKey(date),
      ),
    [date, events],
  );
  const title = dict.today.schedule_title;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div>
        {todayCourses.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={dict.today.noclass}
            description={dict.today.noclass_sub}
            size="sm"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {todayCourses.map((slot, i) => {
              const name = slot.title;
              return (
                <div
                  key={slot.id || i}
                  className="flex items-stretch gap-2 overflow-hidden rounded-md bg-muted"
                >
                  <div
                    className="w-1 shrink-0"
                    style={{
                      backgroundColor:
                        slot.color ?? "hsl(var(--muted-foreground))",
                    }}
                  />
                  <div className="min-w-0 flex-1 py-2">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatInTimeZone(
                        slot.start,
                        UPCOMING_TIME_ZONE,
                        "HH:mm",
                      )}
                      –{formatInTimeZone(slot.end, UPCOMING_TIME_ZONE, "HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default ScheduleWidget;
