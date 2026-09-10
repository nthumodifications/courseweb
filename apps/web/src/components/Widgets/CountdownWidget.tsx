import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { semesterInfo, getSemester } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { Timer } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { Badge, cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import useUpcomingEvents, {
  UPCOMING_TIME_ZONE,
  UpcomingEvent,
} from "@/hooks/useUpcomingEvents";

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

  if (!event) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        {dict.today.upcoming.nothing_scheduled}
      </div>
    );
  }

  const when = event.allDay
    ? dict.today.upcoming.all_day
    : formatInTimeZone(event.start, UPCOMING_TIME_ZONE, "HH:mm");
  const status =
    event.state === "in-progress"
      ? dict.today.upcoming.in_progress
      : event.startsInMinutes === 1
        ? dict.today.upcoming.starts_in_one
        : dict.today.upcoming.starts_in.replace(
            "{minutes}",
            String(event.startsInMinutes),
          );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <span className="shrink-0 text-xs font-semibold text-primary">
        {dict.today.upcoming.next_up}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {event.title}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {when} · {status}
      </span>
      <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
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
  const { language } = useSettings();
  const date = useTime();
  const { nextEvent } = useUpcomingEvents();
  const title = language === "zh" ? "學期倒數" : "Semester Countdown";

  const countdownInfo = useMemo(() => {
    // Find current semester
    const curr = getSemester(date);
    if (!curr) {
      // Try to find the next upcoming semester
      const upcoming = semesterInfo.find((s) => s.begins > date);
      if (upcoming) {
        const diff = Math.ceil(
          (upcoming.begins.getTime() - date.getTime()) / 86400000,
        );
        return {
          type: "vacation" as const,
          days: diff,
          label:
            language === "zh"
              ? `距離下學期還有 ${diff} 天`
              : `${diff} days until next semester`,
          emoji: "🌴",
        };
      }
      return null;
    }
    const daysLeft = Math.ceil(
      (curr.ends.getTime() - date.getTime()) / 86400000,
    );
    if (daysLeft < 0) {
      return {
        type: "past" as const,
        days: 0,
        label: language === "zh" ? "學期已結束" : "Semester ended",
        emoji: "🎉",
      };
    }
    return {
      type: "active" as const,
      days: daysLeft,
      semId: curr.id,
      label: language === "zh" ? `距離學期結束還有` : `days left in semester`,
      emoji: daysLeft <= 14 ? "🔥" : daysLeft <= 30 ? "⏰" : "📚",
    };
  }, [date, language]);

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
            <span className="text-sm">
              {language === "zh" ? "無法取得學期資訊" : "No semester data"}
            </span>
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
