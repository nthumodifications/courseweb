import { FC } from "react";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";

const DAY_LABELS: Record<string, { zh: string; en: string }> = {
  0: { zh: "週一", en: "Mon" },
  1: { zh: "週二", en: "Tue" },
  2: { zh: "週三", en: "Wed" },
  3: { zh: "週四", en: "Thu" },
  4: { zh: "週五", en: "Fri" },
  5: { zh: "週六", en: "Sat" },
  6: { zh: "週日", en: "Sun" },
};

interface TimetableAgendaProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const TimetableAgenda: FC<TimetableAgendaProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();

  // Group by day of week
  const byDay = timetableData.reduce(
    (acc, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    },
    {} as Record<number, CourseTimeslotData[]>,
  );

  // Sort days and slots within each day
  const sortedDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

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

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {sortedDays.map((day) => {
        const daySlots = byDay[day].sort((a, b) => a.startTime - b.startTime);
        const dayLabel = DAY_LABELS[day];

        return (
          <div key={day} className="flex flex-col gap-2">
            {/* Day header */}
            <div className="flex items-center gap-3">
              <div className="w-12 text-center">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {language === "zh" ? dayLabel.zh : dayLabel.en}
                </div>
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Courses for this day */}
            <div className="flex flex-col gap-1.5 pl-2">
              {daySlots.map((slot, idx) => {
                const startSlot = scheduleTimeSlots[slot.startTime];
                const endSlot = scheduleTimeSlots[slot.endTime];
                const startTime = startSlot?.start ?? "";
                const endTime = endSlot?.end ?? "";
                const name =
                  language === "zh"
                    ? slot.course.name_zh
                    : slot.course.name_en || slot.course.name_zh;
                const teacher =
                  language === "zh"
                    ? slot.course.teacher_zh?.join(", ")
                    : slot.course.teacher_en?.join(", ") ||
                      slot.course.teacher_zh?.join(", ");

                return (
                  <div
                    key={idx}
                    className="flex items-stretch gap-3 rounded-lg overflow-hidden border border-border"
                  >
                    {/* Color accent bar */}
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: slot.color }}
                    />

                    {/* Time column */}
                    <div className="flex flex-col justify-center items-center py-2 w-16 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        {startTime}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        –
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {endTime}
                      </span>
                    </div>

                    {/* Course info */}
                    <div className="flex flex-col justify-center py-2 pr-3 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {name}
                      </span>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {teacher && (
                          <span className="text-xs text-muted-foreground truncate">
                            {teacher}
                          </span>
                        )}
                        {slot.venue && (
                          <span className="text-xs text-muted-foreground/70 truncate">
                            @ {slot.venue}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Credits badge */}
                    {slot.course.credits != null && (
                      <div className="flex items-center pr-3">
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: slot.color + "30",
                            color: slot.color,
                          }}
                        >
                          {slot.course.credits}cr
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimetableAgenda;
