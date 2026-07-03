import { FC } from "react";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";

interface TimetableDotsProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const DAY_LABELS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
const DAY_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"];

const TimetableDots: FC<TimetableDotsProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();

  if (timetableData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-40 text-muted-foreground text-sm",
          className,
        )}
      >
        {language === "zh" ? "尚未加入課程" : "No courses added yet"}
      </div>
    );
  }

  // Build a map: day -> slot -> CourseTimeslotData
  const slotMap: Record<number, Record<number, CourseTimeslotData>> = {};
  for (const slot of timetableData) {
    for (let t = slot.startTime; t <= slot.endTime; t++) {
      if (!slotMap[t]) slotMap[t] = {};
      slotMap[t][slot.dayOfWeek] = slot;
    }
  }

  const usedTimeSlots = Object.keys(slotMap)
    .map(Number)
    .sort((a, b) => a - b);
  const usedDays = [...new Set(timetableData.map((s) => s.dayOfWeek))].sort();

  return (
    <div className={cn("overflow-auto p-3", className)}>
      <div className="inline-flex flex-col gap-0.5">
        {/* Header */}
        <div className="flex gap-0.5">
          <div className="w-12" />
          {usedDays.map((d) => (
            <div
              key={d}
              className="w-16 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1"
            >
              {language === "zh" ? DAY_LABELS_ZH[d] : DAY_LABELS[d]}
            </div>
          ))}
        </div>

        {/* Rows per time slot */}
        {usedTimeSlots.map((t) => {
          const slotInfo = scheduleTimeSlots[t];
          return (
            <div key={t} className="flex gap-0.5 items-center">
              {/* Time label */}
              <div className="w-12 text-right pr-2 text-[10px] font-mono text-muted-foreground/70 shrink-0">
                {slotInfo?.start ?? String(t)}
              </div>

              {/* Day cells */}
              {usedDays.map((d) => {
                const slot = slotMap[t]?.[d];
                return (
                  <div
                    key={d}
                    className="w-16 h-8 rounded flex items-center justify-center"
                    style={
                      slot
                        ? {
                            backgroundColor: slot.color + "22",
                            border: `1.5px solid ${slot.color}88`,
                          }
                        : { border: "1.5px solid transparent" }
                    }
                    title={
                      slot
                        ? language === "zh"
                          ? slot.course.name_zh
                          : slot.course.name_en || slot.course.name_zh
                        : undefined
                    }
                  >
                    {slot && (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slot.color }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimetableDots;
