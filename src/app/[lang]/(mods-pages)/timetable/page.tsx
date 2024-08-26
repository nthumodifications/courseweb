"use client";
import Timetable from "@/components/Timetable/Timetable";
import { NextPage } from "next";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalStorage } from "usehooks-ts";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import TimetableSidebar from "@/components/Timetable/TimetableSidebar";

const TimetablePage: NextPage = () => {
  const { getSemesterCourses, semester, setSemester, colorMap } =
    useUserTimetable();
  const [vertical, setVertical] = useLocalStorage("timetable_vertical", true);

  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
    colorMap,
  );

  return (
    <div className="flex flex-col w-full h-full">
      <SemesterSwitcher semester={semester} setSemester={setSemester} />
      <div
        className={`grid grid-cols-1 md:grid-rows-1 ${!vertical ? "" : "md:grid-cols-[3fr_2fr]"} px-1 py-4 md:p-4 gap-4 md:gap-2`}
      >
        <div className="w-full h-full">
          <Timetable
            timetableData={timetableData}
            vertical={vertical}
            renderTimetableSlot={renderTimetableSlot}
          />
        </div>
        <TimetableSidebar vertical={vertical} setVertical={setVertical} />
      </div>
    </div>
  );
};

export default TimetablePage;
