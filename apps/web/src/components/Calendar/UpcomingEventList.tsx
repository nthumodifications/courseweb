import { FC, useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, Clock } from "lucide-react";
import { Badge, EmptyState, type EmptyStateSize } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { EventPopover } from "@/components/Calendar/EventPopover";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import useTime from "@/hooks/useTime";
import {
  addTaipeiDays,
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
  UpcomingEvent,
} from "@/hooks/useUpcomingEvents";
import { useSettings } from "@/hooks/contexts/settings";

type UpcomingEventListProps = {
  events: UpcomingEvent[];
  compact?: boolean;
  showDayGroups?: boolean;
  maxEvents?: number;
  className?: string;
  emptyStateSize: EmptyStateSize;
};

const sourceBadgeStyles: Record<UpcomingEvent["source"], string> = {
  academic: "border-info bg-info text-info-foreground",
  "course-date": "border-border bg-muted text-muted-foreground",
  class: "border-primary bg-primary text-primary-foreground",
  calendar: "border-success bg-success text-success-foreground",
};

const EventRow: FC<{ event: UpcomingEvent; compact: boolean }> = ({
  event,
  compact,
}) => {
  const dict = useDictionary();
  const time = event.allDay
    ? dict.today.upcoming.all_day
    : `${formatInTimeZone(event.start, UPCOMING_TIME_ZONE, "HH:mm")}–${formatInTimeZone(event.end, UPCOMING_TIME_ZONE, "HH:mm")}`;
  const row = (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md",
        compact ? "px-1 py-1" : "border border-border px-2 py-2",
      )}
    >
      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {event.allDay ? (
          <Calendar className="size-3" />
        ) : (
          <Clock className="size-3" />
        )}
        <span className="whitespace-nowrap tabular-nums">{time}</span>
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {event.title}
      </span>
      {event.state === "in-progress" && (
        <span className="shrink-0 text-xs text-primary">
          {dict.today.upcoming.in_progress}
        </span>
      )}
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 px-2 py-0 text-xs leading-4",
          sourceBadgeStyles[event.source],
        )}
      >
        {dict.today.upcoming.source[event.source]}
      </Badge>
    </div>
  );

  return event.calendarEvent ? (
    <EventPopover event={event.calendarEvent}>{row}</EventPopover>
  ) : (
    row
  );
};

const UpcomingEventList: FC<UpcomingEventListProps> = ({
  events,
  compact = false,
  showDayGroups = true,
  maxEvents,
  className,
  emptyStateSize,
}) => {
  const { language, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const now = useTime(60 * 1000);
  const visibleEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.state !== "past" &&
            (event.source !== "academic" || showAcademicCalendar),
        )
        .slice(0, maxEvents),
    [events, maxEvents, showAcademicCalendar],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, UpcomingEvent[]>();
    for (const event of visibleEvents) {
      const key = getTaipeiDateKey(event.start);
      const group = grouped.get(key) ?? [];
      group.push(event);
      grouped.set(key, group);
    }
    return grouped;
  }, [visibleEvents]);
  const todayKey = getTaipeiDateKey(now);
  const tomorrowKey = getTaipeiDateKey(addTaipeiDays(now, 1));

  if (visibleEvents.length === 0) {
    return (
      <EmptyState
        className={className}
        icon={Calendar}
        title={dict.calendar.empty_title}
        description={dict.calendar.empty_description}
        size={emptyStateSize}
      />
    );
  }

  if (!showDayGroups) {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        {visibleEvents.map((event) => (
          <EventRow key={event.id} event={event} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from(groups.entries()).map(([dateKey, group]) => {
        const dayTitle =
          dateKey === todayKey
            ? dict.today.upcoming.today
            : dateKey === tomorrowKey
              ? dict.today.upcoming.tomorrow
              : formatInTimeZone(group[0].start, UPCOMING_TIME_ZONE, "EEEE", {
                  locale: getLocale(language),
                });
        return (
          <section key={dateKey} className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold">{dayTitle}</h3>
              <span className="text-xs text-muted-foreground">
                {formatInTimeZone(group[0].start, UPCOMING_TIME_ZONE, "MM/dd")}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {group.map((event) => (
                <EventRow key={event.id} event={event} compact={compact} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default UpcomingEventList;
