import { useSettings } from "@/hooks/contexts/settings";
import { CourseTimeslotData, TimetableDim } from "@/types/timetable";
import { forwardRef, HTMLAttributes } from "react";
import { VenueChip } from "./VenueChip";
import { scheduleTimeSlots } from "@courseweb/shared";
import useUserTimetable, {
  DEFAULT_FIELD_ORDER,
  TimetableFieldKey,
} from "@/hooks/contexts/useUserTimetable";
import { cn } from "@courseweb/ui";

type TimetableSlotProps = {
  course: CourseTimeslotData;
  tableDim: TimetableDim;
  fraction?: number;
  fractionIndex?: number;
} & HTMLAttributes<HTMLDivElement>;

const TimetableSlotVertical = forwardRef<HTMLDivElement, TimetableSlotProps>(
  ({ course, tableDim, fraction = 1, fractionIndex = 1, ...props }, ref) => {
    const { language } = useSettings();
    const { preferences } = useUserTimetable();

    const displayLang =
      preferences.language == "app" ? language : preferences.language;

    const flexAlign =
      preferences.align == "left"
        ? "items-start"
        : preferences.align == "center"
          ? "items-center"
          : "items-end";
    const textAlign =
      preferences.align == "left"
        ? "text-left"
        : preferences.align == "center"
          ? "text-center"
          : "text-right";
    const justifyContent =
      (preferences.verticalAlign ?? "top") == "top"
        ? "justify-start"
        : (preferences.verticalAlign ?? "top") == "center"
          ? "justify-center"
          : "justify-end";

    const fieldOrder: TimetableFieldKey[] =
      preferences.fieldOrder ?? DEFAULT_FIELD_ORDER;
    const display = preferences.display;

    const teacherName =
      displayLang == "zh"
        ? course.course.teacher_zh?.join(", ")
        : course.course.teacher_en?.join(", ");

    const renderField = (field: TimetableFieldKey) => {
      switch (field) {
        case "code":
          return display.code ? (
            <span key="code" className={cn("text-xs font-medium", textAlign)}>
              {course.course.department + course.course.course}
            </span>
          ) : null;
        case "title":
          return display.title ? (
            <span
              key="title"
              className={cn("text-xs md:text-sm font-medium w-full", textAlign)}
            >
              {displayLang == "zh"
                ? course.course.name_zh
                : course.course.name_en}
            </span>
          ) : null;
        case "time":
          return display.time &&
            scheduleTimeSlots[course.startTime] &&
            scheduleTimeSlots[course.endTime] ? (
            <span key="time" className={cn("text-xs", textAlign)}>
              {scheduleTimeSlots[course.startTime].start} -{" "}
              {scheduleTimeSlots[course.endTime].end}
            </span>
          ) : null;
        case "teacher":
          return display.teacher && teacherName ? (
            <span key="teacher" className={cn("text-xs", textAlign)}>
              {teacherName}
            </span>
          ) : null;
        case "venue":
          return display.venue ? (
            <div key="venue" className={cn("flex", flexAlign)}>
              <VenueChip
                venue={course.venue}
                color={course.textColor}
                textColor={course.textColor}
              />
            </div>
          ) : null;
        case "credits":
          return display.credits ? (
            <span key="credits" className={cn("text-xs", textAlign)}>
              {course.course.credits} cr
            </span>
          ) : null;
        default:
          return null;
      }
    };

    return (
      <div
        ref={ref}
        className="absolute rounded-md transform translate-y-0.5"
        style={{
          left:
            tableDim.header.width +
            course.dayOfWeek * tableDim.timetable.width +
            (fractionIndex - 1) * (tableDim.timetable.width / fraction) +
            2,
          top:
            tableDim.header.height +
            course.startTime * tableDim.timetable.height,
          width: tableDim.timetable.width / fraction - 4,
          height:
            (course.endTime - course.startTime + 1) *
              tableDim.timetable.height -
            4,
          backgroundColor: course.color,
        }}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col h-full p-1 select-none gap-0.5 overflow-hidden",
            flexAlign,
            justifyContent,
          )}
          style={{ color: course.textColor }}
        >
          {fieldOrder.map((field) => renderField(field))}
        </div>
      </div>
    );
  },
);

TimetableSlotVertical.displayName = "TimetableSlotVertical";

export default TimetableSlotVertical;
