import { FC } from "react";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";

interface TimetableTimelineProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_ZH = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

// Timeline spans 7:00 to 22:00 (15 hours). Each hour = 56px.
const HOUR_HEIGHT = 56;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTop(minutes: number): number {
  const offsetMin = minutes - START_HOUR * 60;
  return (offsetMin / 60) * HOUR_HEIGHT;
}

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

const TimetableTimeline: FC<TimetableTimelineProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();

  // Determine which days have courses
  const daysPresent = [
    ...new Set(timetableData.map((s) => s.dayOfWeek)),
  ].sort();
  const days = daysPresent.length > 0 ? daysPresent : [0, 1, 2, 3, 4];

  const TIME_COL_W = 44;
  const DAY_COL_W = 120;

  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border border-border bg-background",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex sticky top-0 z-10 bg-background border-b border-border">
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} />
        {days.map((day) => (
          <div
            key={day}
            style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
            className="text-center text-xs font-semibold py-2 text-muted-foreground uppercase border-l border-border"
          >
            {language === "zh" ? DAY_LABELS_ZH[day] : DAY_LABELS[day]}
          </div>
        ))}
      </div>

      {/* Timeline body */}
      <div
        className="flex relative"
        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      >
        {/* Time axis */}
        <div
          style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
          className="relative"
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 text-[10px] text-muted-foreground/70 -translate-y-2"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const daySlots = timetableData.filter((s) => s.dayOfWeek === day);
          return (
            <div
              key={day}
              style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
              className="relative border-l border-border"
            >
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/40"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                />
              ))}

              {/* Course blocks */}
              {daySlots.map((slot, i) => {
                const startSlot = scheduleTimeSlots[slot.startTime];
                const endSlot = scheduleTimeSlots[slot.endTime];
                if (!startSlot || !endSlot) return null;

                const top = minutesToTop(timeToMinutes(startSlot.start));
                const bottom = minutesToTop(timeToMinutes(endSlot.end));
                const height = Math.max(bottom - top, 20);
                const name =
                  language === "zh"
                    ? slot.course.name_zh
                    : slot.course.name_en || slot.course.name_zh;

                return (
                  <div
                    key={i}
                    className="absolute inset-x-1 rounded overflow-hidden flex flex-col px-1.5 py-0.5"
                    style={{
                      top,
                      height,
                      backgroundColor: slot.color,
                      color: slot.textColor,
                    }}
                  >
                    <span className="text-[10px] font-semibold leading-tight truncate">
                      {name}
                    </span>
                    {height > 32 && slot.venue && (
                      <span className="text-[10px] opacity-80 truncate">
                        {slot.venue}
                      </span>
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

export default TimetableTimeline;
