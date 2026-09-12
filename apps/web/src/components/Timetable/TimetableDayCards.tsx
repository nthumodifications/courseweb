import { FC } from "react";
import { addDays, format } from "date-fns";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";
import useUserTimetable, {
  TIMETABLE_FONT_FAMILIES,
  TIMETABLE_FONT_SIZE_CLASSES,
} from "@/hooks/contexts/useUserTimetable";
import { getLocale } from "@/helpers/dateLocale";
import { getTimetableDataTimeRange } from "@/helpers/timetable";

interface TimetableDayCardsProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const TimetableDayCards: FC<TimetableDayCardsProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();
  const { preferences } = useUserTimetable();
  const fontSizeClass =
    TIMETABLE_FONT_SIZE_CLASSES[preferences.fontSize ?? "sm"];
  const fontFamily =
    TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];

  const byDay: Record<number, CourseTimeslotData[]> = {};
  for (const slot of timetableData) {
    if (slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6) {
      if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
      byDay[slot.dayOfWeek].push(slot);
    }
  }

  const hasSaturday = timetableData.some((s) => s.dayOfWeek === 5);
  const hasSunday = timetableData.some((s) => s.dayOfWeek === 6);
  const days = hasSunday
    ? [0, 1, 2, 3, 4, 5, 6]
    : hasSaturday
      ? [0, 1, 2, 3, 4, 5]
      : [0, 1, 2, 3, 4];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-3">
        {days.map((day) => {
          const slots = (byDay[day] ?? []).sort(
            (a, b) =>
              getTimetableDataTimeRange(a).start -
              getTimetableDataTimeRange(b).start,
          );
          const dayLabel = format(addDays(new Date(2024, 0, 1), day), "EEE", {
            locale: getLocale(language),
          });

          return (
            <div
              key={day}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 min-h-[120px] bg-card"
            >
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                {dayLabel}
              </div>

              {slots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">—</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {slots.map((slot, i) => {
                    const startTime =
                      slot.customSlot?.start ??
                      scheduleTimeSlots[slot.startTime]?.start ??
                      "";
                    const endTime =
                      slot.customSlot?.end ??
                      scheduleTimeSlots[slot.endTime]?.end ??
                      "";
                    const name =
                      slot.customItem?.title ??
                      (language === "zh"
                        ? slot.course.name_zh
                        : slot.course.name_en || slot.course.name_zh);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-1 rounded-sm px-1",
                          slot.customItem && "border border-dashed",
                        )}
                        style={{
                          color: slot.textColor,
                          borderColor: slot.customItem
                            ? slot.textColor
                            : undefined,
                          fontFamily,
                        }}
                      >
                        <div
                          className="mt-1 w-1 h-full rounded-full shrink-0 self-stretch"
                          style={{ backgroundColor: slot.color, minHeight: 14 }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              fontSizeClass,
                              "font-semibold leading-tight truncate",
                            )}
                          >
                            {slot.customItem && (
                              <CalendarClock className="inline-block h-3 w-3 mr-1" />
                            )}
                            {name}
                          </span>
                          <span
                            className={cn(
                              fontSizeClass,
                              "font-mono opacity-80",
                            )}
                          >
                            {startTime}–{endTime}
                          </span>
                          {slot.customItem?.venue && (
                            <span
                              className={cn(
                                fontSizeClass,
                                "truncate opacity-80",
                              )}
                            >
                              {slot.customItem.venue}
                            </span>
                          )}
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
