import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { semesterInfo, getSemester } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { Timer } from "lucide-react";

interface CountdownWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const CountdownWidget: FC<CountdownWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { language } = useSettings();
  const date = useTime();
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
      <div className="p-4 flex flex-col items-center justify-center min-h-[100px]">
        {!countdownInfo ? (
          <div className="flex flex-col items-center text-muted-foreground">
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
