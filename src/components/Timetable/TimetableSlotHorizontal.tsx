import { useSettings } from "@/hooks/contexts/settings";
import { CourseTimeslotData, TimetableDim } from "@/types/timetable";
import { FC, HTMLAttributes } from "react";
import { VenueChip } from "./VenueChip";
import { scheduleTimeSlots } from "@/const/timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { cn } from "@/lib/utils";

type TimetableSlotProps = {
  course: CourseTimeslotData;
  tableDim: TimetableDim;
  fraction?: number;
  fractionIndex?: number;
} & HTMLAttributes<HTMLDivElement>;

const TimetableSlotHorizontal: FC<TimetableSlotProps> = ({
  course,
  tableDim,
  fraction = 1,
  fractionIndex = 1,
  ...props
}) => {
  const { language } = useSettings();
  const { preferences } = useUserTimetable();
  const displayLang =
    preferences.language == "app" ? language : preferences.language;

  return (
    <div
      className={`absolute rounded-md transform translate-y-0.5`}
      style={{
        left:
          tableDim.header.width +
          course.startTime * tableDim.timetable.width +
          2,
        top:
          tableDim.header.height +
          course.dayOfWeek * tableDim.timetable.height +
          (fractionIndex - 1) * (tableDim.timetable.height / fraction),
        width:
          tableDim.timetable.width * (course.endTime - course.startTime + 1) -
          4,
        height: tableDim.timetable.height / fraction - 4,
        backgroundColor: course.color,
        color: course.textColor,
      }}
      {...props}
    >
      <div
        className={cn(
          "flex flex-col justify-start items-start text-left h-full p-1 select-none",
        )}
      >
        <div className="flex-1 flex flex-col justify-start items-start text-left w-full">
          {preferences.display.code && (
            <span className="text-xs font-medium" id="time_slot">
              {course.course.department + course.course.course}
            </span>
          )}
          {preferences.display.title &&
            (displayLang == "zh" ? (
              <span className="text-xs md:text-sm line-clamp-1 font-medium">
                {course.course.name_zh}
              </span>
            ) : (
              <span className="text-xs line-clamp-1 font-medium">
                {course.course.name_en}
              </span>
            ))}
          {preferences.display.time && (
            <span className="text-xs line-clamp-1" id="time_slot">
              {scheduleTimeSlots[course.startTime].start} -{" "}
              {scheduleTimeSlots[course.endTime].end}
            </span>
          )}
        </div>
        {preferences.display.venue && (
          <VenueChip
            venue={course.venue}
            color={course.textColor}
            textColor={course.color}
          />
        )}
      </div>
    </div>
  );
};

export default TimetableSlotHorizontal;
