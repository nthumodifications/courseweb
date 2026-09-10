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
import useDictionary from "@/dictionaries/useDictionary";

interface TimetableAgendaProps {
  timetableData: CourseTimeslotData[];
  className?: string;
}

const TimetableAgenda: FC<TimetableAgendaProps> = ({
  timetableData,
  className,
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const { preferences } = useUserTimetable();
  const fontSizeClass =
    TIMETABLE_FONT_SIZE_CLASSES[preferences.fontSize ?? "sm"];
  const fontFamily =
    TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];

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
        {dict.timetable.no_courses}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {sortedDays.map((day) => {
        const daySlots = byDay[day].sort((a, b) => a.startTime - b.startTime);
        const dayLabel = format(addDays(new Date(2024, 0, 1), day), "EEE", {
          locale: getLocale(language),
        });

        return (
          <div key={day} className="flex flex-col gap-2">
            {/* Day header */}
            <div className="flex items-center gap-3">
              <div className="w-12 text-center">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {dayLabel}
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
                  slot.customItem?.title ??
                  (language === "zh"
                    ? slot.course.name_zh
                    : slot.course.name_en || slot.course.name_zh);
                const teacher = slot.customItem
                  ? undefined
                  : language === "zh"
                    ? slot.course.teacher_zh?.join(", ")
                    : slot.course.teacher_en?.join(", ") ||
                      slot.course.teacher_zh?.join(", ");

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-stretch gap-3 rounded-lg overflow-hidden border border-border",
                      slot.customItem && "border-dashed",
                    )}
                    style={{
                      borderColor: slot.customItem ? slot.textColor : undefined,
                      fontFamily,
                    }}
                  >
                    {/* Color accent bar */}
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: slot.color }}
                    />

                    {/* Time column */}
                    <div className="flex flex-col justify-center items-center py-2 w-16 shrink-0">
                      <span
                        className={cn(
                          fontSizeClass,
                          "font-mono text-muted-foreground",
                        )}
                      >
                        {startTime}
                      </span>
                      <span
                        className={cn(
                          fontSizeClass,
                          "text-muted-foreground/60",
                        )}
                      >
                        –
                      </span>
                      <span
                        className={cn(
                          fontSizeClass,
                          "font-mono text-muted-foreground",
                        )}
                      >
                        {endTime}
                      </span>
                    </div>

                    {/* Course info */}
                    <div className="flex flex-col justify-center py-2 pr-3 flex-1 min-w-0">
                      <span
                        className={cn(
                          fontSizeClass,
                          "font-medium truncate min-w-0",
                        )}
                        style={{ color: slot.textColor }}
                      >
                        {slot.customItem && (
                          <CalendarClock className="inline-block h-3 w-3 mr-1" />
                        )}
                        {name}
                      </span>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {teacher && (
                          <span
                            className={cn(
                              fontSizeClass,
                              "text-muted-foreground truncate",
                            )}
                          >
                            {teacher}
                          </span>
                        )}
                        {slot.venue && (
                          <span
                            className={cn(
                              fontSizeClass,
                              "text-muted-foreground/70 truncate",
                            )}
                          >
                            @ {slot.venue}
                          </span>
                        )}
                        {slot.customItem?.note && (
                          <span
                            className={cn(
                              fontSizeClass,
                              "text-muted-foreground/70 truncate",
                            )}
                          >
                            {slot.customItem.note}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Credits badge */}
                    {!slot.customItem && slot.course.credits != null && (
                      <div className="flex items-center pr-3">
                        <span
                          className={cn(
                            fontSizeClass,
                            "font-semibold px-1.5 py-0.5 rounded",
                          )}
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
