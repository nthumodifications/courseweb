import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useSettings } from "@/hooks/contexts/settings";
import { scheduleTimeSlots, getSemester } from "@courseweb/shared";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import useTime from "@/hooks/useTime";
import { Calendar } from "lucide-react";

interface ScheduleWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const ScheduleWidget: FC<ScheduleWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { getSemesterCourses, colorMap } = useUserTimetable();
  const { language } = useSettings();
  const date = useTime();

  const curr_sem = useMemo(() => getSemester(date), [date]);
  const timetableData = useMemo(
    () =>
      createTimetableFromCourses(
        getSemesterCourses(curr_sem?.id) as MinimalCourse[],
        colorMap,
      ),
    [getSemesterCourses, curr_sem, colorMap],
  );

  const todayOfWeek = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  // convert to 0=Mon...6=Sun format used by timetableData
  const normalizedDay = todayOfWeek === 0 ? 6 : todayOfWeek - 1;

  const todayCourses = useMemo(
    () =>
      timetableData
        .filter((slot) => slot.dayOfWeek === normalizedDay)
        .sort((a, b) => a.startTime - b.startTime),
    [timetableData, normalizedDay],
  );

  const title = language === "zh" ? "今日課程" : "Today's Schedule";

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-4">
        {todayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {language === "zh" ? "今天沒有課程" : "No classes today"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayCourses.map((slot, i) => {
              const start = scheduleTimeSlots[slot.startTime]?.start ?? "";
              const end = scheduleTimeSlots[slot.endTime]?.end ?? "";
              const name =
                language === "zh"
                  ? slot.course.name_zh
                  : slot.course.name_en || slot.course.name_zh;
              return (
                <div
                  key={i}
                  className="flex items-stretch gap-2 rounded-lg overflow-hidden border border-border"
                >
                  <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: slot.color }}
                  />
                  <div className="py-2 flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {start}–{end}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default ScheduleWidget;
