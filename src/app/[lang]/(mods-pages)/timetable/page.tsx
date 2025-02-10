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
import { useSwipeable } from "react-swipeable";
import { semesterInfo } from "@/const/semester";

const TimetablePage: NextPage = () => {
  const { getSemesterCourses, semester, setSemester, colorMap } =
    useUserTimetable();
  const [vertical, setVertical] = useLocalStorage("timetable_vertical", true);

  const sampleCourse: MinimalCourse = {
    // 1 Session, Same Day
    raw_id: "11310EECS123402",
    class: "02",
    course: "1234",
    credits: 3,
    department: "EECS",
    language: "英",
    name_en: "Introduction to Computer Science",
    name_zh: "計算機概論",
    semester: "11310",
    times: ["W3W4"],
    venues: ["Room 202"],
    teacher_en: ["Jane Doe"],
    teacher_zh: ["杜蘭"],
  };

  const courses: MinimalCourse[] = [
    {
      // 1 Session, Same Day
      ...sampleCourse,
      times: ["W3W4"],
      venues: ["Room 202"],
    },
    {
      // 2 Sessions, Different Days
      ...sampleCourse,
      times: ["M1M2W3W4"],
      venues: ["Room 101"],
    },
    {
      // 2 Sessions, Same Day
      ...sampleCourse,
      times: ["M1M2MaMb"],
      venues: ["Room 303"],
    },
    {
      // 3 Sessions, Different Days
      ...sampleCourse,
      times: ["M1M2W3W4F5"],
      venues: ["Room 404"],
    },
    {
      // 2 Sessions, Different Days, Different venues
      ...sampleCourse,
      times: ["M1M2W3W4"],
      venues: ["Room 101", "Room 202"],
    },
    {
      // 2 Sessions, Same Day, Different venues
      ...sampleCourse,
      times: ["M1M2MaMb"],
      venues: ["Room 303", "Room 404"],
    },
  ];

  console.log(
    "timetable",
    createTimetableFromCourses(courses, {
      "11310EECS123402": "#FF5733",
    }),
  );

  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
    colorMap,
  );

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const currentSemesterIndex = semesterInfo.findIndex(
        (semObj) => semObj.id === semester,
      );
      if (currentSemesterIndex < semesterInfo.length - 1) {
        setSemester(semesterInfo[currentSemesterIndex + 1].id);
      }
    },
    onSwipedRight: (eventData) => {
      const currentSemesterIndex = semesterInfo.findIndex(
        (semObj) => semObj.id === semester,
      );
      if (currentSemesterIndex > 0) {
        setSemester(semesterInfo[currentSemesterIndex - 1].id);
      }
    },
  });

  return (
    <div className="flex flex-col w-full h-full">
      <SemesterSwitcher semester={semester} setSemester={setSemester} />
      <div
        className={`grid grid-cols-1 md:grid-rows-1 ${!vertical ? "" : "md:grid-cols-[3fr_2fr]"} px-1 py-4 md:p-4 gap-4 md:gap-2`}
      >
        <div className="w-full h-full" {...handlers}>
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
