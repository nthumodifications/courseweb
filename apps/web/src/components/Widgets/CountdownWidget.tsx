import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import type { SemesterInfo } from "@courseweb/shared";
import useTime from "@/hooks/useTime";
import { format, formatDistanceStrict } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Badge, cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import useUpcomingEvents, {
  getTaipeiDateRange,
  UPCOMING_TIME_ZONE,
  UpcomingEvent,
} from "@/hooks/useUpcomingEvents";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";
import { useLocalStorage } from "usehooks-ts";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useSemesters } from "@/hooks/useSemesters";

const DATE_KEY_FORMAT = "yyyy-MM-dd";

const getSemesterDateRange = (semester: SemesterInfo) =>
  getTaipeiDateRange(
    format(semester.begins, DATE_KEY_FORMAT),
    format(semester.ends, DATE_KEY_FORMAT),
  );

interface CountdownWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export const NextUpLine: FC<{
  event: UpcomingEvent | null;
  className?: string;
}> = ({ event, className }) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(60_000);
  if (!event) {
    return null;
  }

  const when = event.allDay
    ? dict.today.upcoming.all_day
    : formatInTimeZone(event.start, UPCOMING_TIME_ZONE, "HH:mm");
  const status =
    event.state === "in-progress"
      ? dict.today.upcoming.in_progress
      : dict.today.upcoming.starts_in.replace(
          "{duration}",
          formatDistanceStrict(event.start, now, {
            locale: getLocale(language),
          }),
        );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2",
        className,
      )}
    >
      <span className="shrink-0 text-xs font-medium text-primary">
        {dict.today.upcoming.next_up}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {event.title}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {when} · {status}
      </span>
      <Badge variant="outline" className="shrink-0 px-2 py-0 text-[10px]">
        {dict.today.upcoming.source[event.source]}
      </Badge>
    </div>
  );
};

const CountdownWidget: FC<CountdownWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const semesters = useSemesters();
  const dict = useDictionary();
  const date = useTime();
  const [customTitle] = useLocalStorage("widget_countdown_title", "");
  const [customDate] = useLocalStorage("widget_countdown_date", "");
  const { nextEvent } = useUpcomingEvents();
  const title = dict.today.countdown.title;
  const dayNumberClass = "font-[600] tabular-nums text-primary";

  const countdownInfo = useMemo(() => {
    if (customDate) {
      const target = parseISO(customDate);
      if (!Number.isNaN(target.getTime())) {
        const today = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
        const targetDay = new Date(
          target.getFullYear(),
          target.getMonth(),
          target.getDate(),
        );
        const days = Math.max(0, differenceInCalendarDays(targetDay, today));
        return {
          type: "active" as const,
          days,
          semId: "custom",
          label:
            customTitle ||
            dict.settings.calendar.widget_dashboard.widget_settings
              .countdown_default_label,
        };
      }
    }
    const current = semesters
      .map((semester) => ({ semester, range: getSemesterDateRange(semester) }))
      .find(({ range }) => range && date >= range.start && date < range.end);

    if (!current) {
      // Try to find the next upcoming semester
      const upcoming = semesters
        .map((semester) => ({
          semester,
          range: getSemesterDateRange(semester),
        }))
        .find(({ range }) => range && range.start > date);
      if (upcoming) {
        const begins = upcoming.range!.start;
        const diff = Math.ceil((begins.getTime() - date.getTime()) / 86400000);
        return {
          type: "vacation" as const,
          days: diff,
          label: dict.today.countdown.until_next_semester,
        };
      }
      return null;
    }
    const daysLeft = Math.ceil(
      (current.range!.end.getTime() - date.getTime()) / 86400000,
    );
    if (daysLeft < 0) {
      return {
        type: "past" as const,
        days: 0,
        label: dict.today.countdown.semester_ended,
      };
    }
    return {
      type: "active" as const,
      days: daysLeft,
      semId: current.semester.id,
      label: dict.today.countdown.days_left,
    };
  }, [customDate, customTitle, date, dict, semesters]);

  return (
    <WidgetShell
      title={title}
      widgetType="countdown"
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 py-2">
        <NextUpLine event={nextEvent} />
        {!countdownInfo ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            {dict.today.countdown.no_data}
          </div>
        ) : (
          <div className="px-4 text-sm text-muted-foreground">
            {countdownInfo.type === "active" && (
              <>
                {countdownInfo.label}{" "}
                <span className={dayNumberClass}>{countdownInfo.days}</span>
              </>
            )}
            {countdownInfo.type === "vacation" &&
              (() => {
                const [before, after] = countdownInfo.label.split("{days}");
                return (
                  <>
                    {before}
                    <span className={dayNumberClass}>{countdownInfo.days}</span>
                    {after}
                  </>
                );
              })()}
            {countdownInfo.type === "past" && (
              <span className="font-medium">{countdownInfo.label}</span>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default CountdownWidget;
