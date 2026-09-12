import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { semesterInfo } from "@courseweb/shared";
import useTime from "@/hooks/useTime";
import { Timer } from "lucide-react";
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

const DATE_KEY_FORMAT = "yyyy-MM-dd";

const getSemesterDateRange = (semester: (typeof semesterInfo)[number]) =>
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
  const dict = useDictionary();
  const date = useTime();
  const { nextEvent } = useUpcomingEvents();
  const title = dict.today.countdown.title;

  const countdownInfo = useMemo(() => {
    const current = semesterInfo
      .map((semester) => ({ semester, range: getSemesterDateRange(semester) }))
      .find(({ range }) => range && date >= range.start && date < range.end);

    if (!current) {
      // Try to find the next upcoming semester
      const upcoming = semesterInfo
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
          label: dict.today.countdown.until_next_semester.replace(
            "{days}",
            String(diff),
          ),
          emoji: "🌴",
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
        emoji: "🎉",
      };
    }
    return {
      type: "active" as const,
      days: daysLeft,
      semId: current.semester.id,
      label: dict.today.countdown.days_left,
      emoji: daysLeft <= 14 ? "🔥" : daysLeft <= 30 ? "⏰" : "📚",
    };
  }, [date, dict]);

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <NextUpLine event={nextEvent} />
        {!countdownInfo ? (
          <div className="flex min-h-[100px] flex-col items-center justify-center text-muted-foreground">
            <Timer className="h-8 w-8 mb-2 text-muted-foreground/40" />
            <span className="text-sm">{dict.today.countdown.no_data}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">{countdownInfo.emoji}</span>
            {countdownInfo.type === "active" ? (
              <>
                <div className="text-4xl font-bold tabular-nums text-primary">
                  {countdownInfo.days}
                </div>
                <div className="text-sm text-muted-foreground">
                  {countdownInfo.label}
                </div>
              </>
            ) : (
              <div className="text-sm font-medium">{countdownInfo.label}</div>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default CountdownWidget;
