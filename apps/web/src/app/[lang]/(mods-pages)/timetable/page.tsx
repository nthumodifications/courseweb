import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalStorage } from "usehooks-ts";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import TimetableSidebar from "@/components/Timetable/TimetableSidebar";
import { useSwipeable } from "react-swipeable";
import { semesterInfo } from "@courseweb/shared";
import { useHeaderPortal } from "@/components/Portal/HeaderPortal";
import { useEffect } from "react";

const TimetablePage = () => {
  const { getSemesterCourses, semester, setSemester, colorMap } =
    useUserTimetable();
  const [vertical, setVertical] = useLocalStorage("timetable_vertical", true);
  const { setPortalContent, clearPortalContent } = useHeaderPortal();

  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
    colorMap,
  );

  // Set the SemesterSwitcher in the header portal
  useEffect(() => {
    setPortalContent(
      <div className="flex justify-center w-full">
        <SemesterSwitcher semester={semester} setSemester={setSemester} />
      </div>,
    );

    // Clean up when component unmounts
    return () => {
      clearPortalContent();
    };
  }, [semester, setSemester]);

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
