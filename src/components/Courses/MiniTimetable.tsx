import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse, Semester } from "@/types/courses";
import { scheduleTimeSlots } from "@/const/timetable";
import useDictionary from "@/dictionaries/useDictionary";
import { useMemo } from "react";

const MiniTimetable = ({ semester }: { semester: Semester }) => {
  const dict = useDictionary();
  const { getSemesterCourses, colorMap } = useUserTimetable();
  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
    colorMap,
  );
  const timeslots = useMemo(() => {
    const timeslots = new Array(13).fill([]).map(() => new Array(6).fill(null));
    for (const course of timetableData) {
      for (let i = course.startTime; i <= course.endTime; i++) {
        timeslots[i][course.dayOfWeek] = course;
      }
    }
    return timeslots;
  }, [timetableData]);

  return (
    <div className="p-4 flex flex-col overflow-auto">
      <span className="text-xs font-bold uppercase">
        {dict.course.timetable.title}
      </span>
      <div className="grid grid-cols-7 gap-1 mt-4">
        <div></div>
        {["M", "T", "W", "R", "F", "S"].map((d) => {
          return (
            <div
              className="text-xs font-bold text-muted-foreground flex items-center justify-center"
              key={d}
            >
              {d}
            </div>
          );
        })}
        {timeslots.map((timeslot, i) => {
          return timeslot.map((course, j) => {
            if (j === 0)
              return (
                <>
                  <div className="text-xs font-bold text-muted-foreground flex items-center justify-center">
                    {scheduleTimeSlots[i].time}
                  </div>
                  <div
                    key={`${i}-${j}`}
                    className="rounded w-full aspect-square bg-muted"
                    style={{ backgroundColor: course ? course.color : "" }}
                  ></div>
                </>
              );
            return (
              <div
                key={`${i}-${j}`}
                className="rounded w-full aspect-square bg-muted"
                style={{ backgroundColor: course ? course.color : "" }}
              ></div>
            );
          });
        })}
      </div>
    </div>
  );
};

export default MiniTimetable;
