import { FC, ReactNode, useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@courseweb/ui";
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
  emptyContent?: ReactNode;
};

const sourceBadgeStyles: Record<UpcomingEvent["source"], string> = {
  academic:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  "course-date":
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  class:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
  calendar:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
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
        <span className="whitespace-nowrap">{time}</span>
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {event.title}
      </span>
      {event.state === "in-progress" && (
        <span className="shrink-0 text-[10px] text-primary">
          {dict.today.upcoming.in_progress}
        </span>
      )}
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 px-1.5 py-0 text-[10px] leading-4",
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
  emptyContent,
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const now = useTime(60 * 1000);
  const visibleEvents = useMemo(
    () => events.filter((event) => event.state !== "past").slice(0, maxEvents),
    [events, maxEvents],
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
      <div
        className={cn(
          compact
            ? "px-1 py-2 text-xs text-muted-foreground"
            : "rounded-lg border border-dashed border-border px-3 py-5 text-center",
          className,
        )}
      >
        <p className={compact ? undefined : "text-sm font-medium"}>
          {emptyContent ?? dict.today.upcoming.no_events}
        </p>
        {!compact && (
          <p className="mt-1 text-xs text-muted-foreground">
            {dict.today.upcoming.no_events_sub}
          </p>
        )}
      </div>
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
              <span className="text-[11px] text-muted-foreground">
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
