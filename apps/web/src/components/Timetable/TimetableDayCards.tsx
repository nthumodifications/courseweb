import { FC } from "react";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";

interface TimetableDayCardsProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_LABELS_ZH = ["週一", "週二", "週三", "週四", "週五"];

const TimetableDayCards: FC<TimetableDayCardsProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();

  const byDay: Record<number, CourseTimeslotData[]> = {};
  for (const slot of timetableData) {
    if (slot.dayOfWeek >= 0 && slot.dayOfWeek <= 4) {
      if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
      byDay[slot.dayOfWeek].push(slot);
    }
  }

  const days = [0, 1, 2, 3, 4];

  const hasWeekend = timetableData.some((s) => s.dayOfWeek >= 5);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {hasWeekend && (
        <p className="text-xs text-muted-foreground px-3">
          {language === "zh"
            ? "週六、日課程不顯示於此檢視"
            : "Sat/Sun courses not shown in this view"}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3">
        {days.map((day) => {
          const slots = (byDay[day] ?? []).sort(
            (a, b) => a.startTime - b.startTime,
          );
          const dayLabel =
            language === "zh" ? DAY_LABELS_ZH[day] : DAY_LABELS_SHORT[day];

          return (
            <div
              key={day}
              className="flex flex-col gap-2 rounded-xl border border-border p-3 min-h-[120px] bg-card"
            >
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                {dayLabel}
              </div>

              {slots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">—</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {slots.map((slot, i) => {
                    const startSlot = scheduleTimeSlots[slot.startTime];
                    const name =
                      language === "zh"
                        ? slot.course.name_zh
                        : slot.course.name_en || slot.course.name_zh;
                    return (
                      <div key={i} className="flex items-start gap-1.5">
                        <div
                          className="mt-0.5 w-1 h-full rounded-full shrink-0 self-stretch"
                          style={{ backgroundColor: slot.color, minHeight: 14 }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold leading-tight truncate">
                            {name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {startSlot?.start ?? ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimetableDayCards;
