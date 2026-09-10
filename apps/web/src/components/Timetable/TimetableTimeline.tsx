import { FC } from "react";
import { addDays, format } from "date-fns";
import { CourseTimeslotData } from "@/types/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";
import useUserTimetable, {
  TIMETABLE_FONT_FAMILIES,
  TIMETABLE_FONT_SIZE_CLASSES,
} from "@/hooks/contexts/useUserTimetable";
import { getLocale } from "@/helpers/dateLocale";
import {
  addTimetableFractions,
  getTimetableDataTimeRange,
} from "@/helpers/timetable";

interface TimetableTimelineProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

// The timeline starts at least at 7:00 and expands to contain all activities.
// Each hour = 56px.
const HOUR_HEIGHT = 56;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

function minutesToTop(minutes: number, startHour: number): number {
  const offsetMin = minutes - startHour * 60;
  return (offsetMin / 60) * HOUR_HEIGHT;
}

const TimetableTimeline: FC<TimetableTimelineProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();
  const { preferences } = useUserTimetable();
  const fontSizeClass =
    TIMETABLE_FONT_SIZE_CLASSES[preferences.fontSize ?? "sm"];
  const fontFamily =
    TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];
  const timeRanges = timetableData.map(getTimetableDataTimeRange);
  const startHour = Math.min(
    DEFAULT_START_HOUR,
    ...timeRanges.map((range) => Math.floor(range.start / 60)),
  );
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...timeRanges.map((range) => Math.ceil(range.end / 60)),
  );
  const totalHours = endHour - startHour;
  const hours = Array.from(
    { length: totalHours + 1 },
    (_, index) => startHour + index,
  );

  // Determine which days have courses
  const daysPresent = [
    ...new Set(timetableData.map((s) => s.dayOfWeek)),
  ].sort();
  const days = daysPresent.length > 0 ? daysPresent : [0, 1, 2, 3, 4];
  const layoutData = addTimetableFractions(timetableData);

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
            {format(addDays(new Date(2024, 0, 1), day), "EEE", {
              locale: getLocale(language),
            })}
          </div>
        ))}
      </div>

      {/* Timeline body */}
      <div
        className="flex relative"
        style={{ height: totalHours * HOUR_HEIGHT }}
      >
        {/* Time axis */}
        <div
          style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
          className="relative"
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 text-[10px] text-muted-foreground/70 -translate-y-2"
              style={{ top: (hour - startHour) * HOUR_HEIGHT }}
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const daySlots = layoutData
            .filter((s) => s.dayOfWeek === day)
            .sort(
              (a, b) =>
                getTimetableDataTimeRange(a).start -
                getTimetableDataTimeRange(b).start,
            );
          return (
            <div
              key={day}
              style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
              className="relative border-l border-border"
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/40"
                  style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                />
              ))}

              {/* Course blocks */}
              {daySlots.map((slot, i) => {
                const range = getTimetableDataTimeRange(slot);
                const top = minutesToTop(range.start, startHour);
                const bottom = minutesToTop(range.end, startHour);
                const height = Math.max(bottom - top, 20);
                const name =
                  slot.customItem?.title ??
                  (language === "zh"
                    ? slot.course.name_zh
                    : slot.course.name_en || slot.course.name_zh);

                return (
                  <div
                    key={i}
                    className={cn(
                      "absolute rounded overflow-hidden flex flex-col px-1.5 py-0.5",
                      slot.customItem && "border border-dashed",
                    )}
                    style={{
                      top,
                      height,
                      left:
                        (slot.fractionIndex - 1) * (DAY_COL_W / slot.fraction) +
                        4,
                      width: DAY_COL_W / slot.fraction - 8,
                      backgroundColor: slot.color,
                      color: slot.textColor,
                      borderColor: slot.customItem ? slot.textColor : undefined,
                      fontFamily,
                    }}
                  >
                    <span
                      className={cn(
                        fontSizeClass,
                        "font-semibold leading-tight truncate",
                      )}
                    >
                      {slot.customItem && (
                        <CalendarClock className="inline-block h-3 w-3 mr-0.5" />
                      )}
                      {name}
                    </span>
                    {slot.customSlot && (
                      <span
                        className={cn(fontSizeClass, "opacity-80 truncate")}
                      >
                        {slot.customSlot.start}–{slot.customSlot.end}
                      </span>
                    )}
                    {height > 32 && slot.venue && (
                      <span
                        className={cn(fontSizeClass, "opacity-80 truncate")}
                      >
                        {slot.venue}
                      </span>
                    )}
                    {height > 44 && slot.customItem?.note && (
                      <span
                        className={cn(fontSizeClass, "opacity-80 truncate")}
                      >
                        {slot.customItem.note}
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
