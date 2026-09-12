import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import useTime from "@/hooks/useTime";
import { Calendar } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
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
  const upcomingEvents = useMemo(
    () => events.filter((event) => event.state !== "past"),
    [events],
  );

  const title = dict.today.schedule_title;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-4">
        {todayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {dict.today.noclass}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayCourses.map((slot, i) => {
              const name = slot.title;
              return (
                <div
                  key={slot.id || i}
                  className="flex items-stretch gap-2 rounded-lg overflow-hidden border border-border"
                >
                  <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: slot.color ?? "#555555" }}
                  />
                  <div className="py-2 flex-1 min-w-0">
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
        {upcomingEvents.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-sm font-medium">
              {dict.calendar.upcoming_events}
            </div>
            <UpcomingEventList events={upcomingEvents} compact maxEvents={6} />
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default ScheduleWidget;
