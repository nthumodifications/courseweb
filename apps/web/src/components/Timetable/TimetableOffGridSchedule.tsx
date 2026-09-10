import { addDays, format } from "date-fns";
import { FC, useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable, {
  TIMETABLE_FONT_FAMILIES,
  TIMETABLE_FONT_SIZE_CLASSES,
} from "@/hooks/contexts/useUserTimetable";
import { getLocale } from "@/helpers/dateLocale";
import {
  getOffGridTimetableData,
  getTimetableDataTimeRange,
} from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import { TimetableCustomItemDrawer } from "./TimetableItemDrawer";

interface TimetableOffGridScheduleProps {
  timetableData: CourseTimeslotData[];
  editable?: boolean;
  className?: string;
}

const TimetableOffGridSchedule: FC<TimetableOffGridScheduleProps> = ({
  timetableData,
  editable = true,
  className,
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const { preferences } = useUserTimetable();
  const fontSizeClass =
    TIMETABLE_FONT_SIZE_CLASSES[preferences.fontSize ?? "sm"];
  const fontFamily =
    TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];
  const offGridSlots = useMemo(
    () => getOffGridTimetableData(timetableData),
    [timetableData],
  );
  const days = useMemo(
    () =>
      [...new Set(offGridSlots.map((slot) => slot.dayOfWeek))].sort(
        (a, b) => a - b,
      ),
    [offGridSlots],
  );

  if (offGridSlots.length === 0) return null;

  return (
    <section
      className={cn("flex flex-col gap-3", className)}
      aria-labelledby="timetable-off-grid-schedule"
    >
      <h2
        id="timetable-off-grid-schedule"
        className="text-sm font-semibold text-muted-foreground"
      >
        {dict.timetable.custom_items.off_grid_schedule_title}
      </h2>
      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const daySlots = offGridSlots
            .filter((slot) => slot.dayOfWeek === day)
            .sort(
              (a, b) =>
                getTimetableDataTimeRange(a).start -
                getTimetableDataTimeRange(b).start,
            );
          const dayLabel = format(addDays(new Date(2024, 0, 1), day), "EEE", {
            locale: getLocale(language),
          }).toUpperCase();

          return (
            <div key={day} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dayLabel}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-1.5">
                {daySlots.map((slot) => {
                  const customItem = slot.customItem;
                  const customSlot = slot.customSlot;
                  if (!customItem || !customSlot) return null;

                  const row = (
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-border bg-card px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ fontFamily }}
                    >
                      <span
                        className="mt-0.5 h-5 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: customItem.color }}
                        aria-hidden="true"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            fontSizeClass,
                            "flex min-w-0 items-center gap-1 font-semibold",
                          )}
                          style={{ color: slot.textColor }}
                        >
                          <CalendarClock
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{customItem.title}</span>
                        </span>
                        <span
                          className={cn(
                            fontSizeClass,
                            "font-mono text-muted-foreground",
                          )}
                        >
                          {customSlot.start}–{customSlot.end}
                        </span>
                        {(customItem.venue || customItem.note) && (
                          <span
                            className={cn(
                              fontSizeClass,
                              "truncate text-muted-foreground",
                            )}
                          >
                            {[customItem.venue, customItem.note]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  );

                  return (
                    <TimetableCustomItemDrawer
                      key={`${customItem.id}-${customSlot.day}-${customSlot.start}-${customSlot.end}`}
                      item={customItem}
                      editable={editable}
                    >
                      {row}
                    </TimetableCustomItemDrawer>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TimetableOffGridSchedule;
