import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  DownloadTimetableDialogDynamic,
  ShareSyncTimetableDialogDynamic,
} from "@/components/Timetable/TimetableCourseList";
import GroupByDepartmentButton from "@/components/Timetable/GroupByDepartmentButton";
import { filterHiddenCourseIds } from "@/helpers/timetableVisibility";

const TimetableBottomBar = () => {
  const { semester, courses, colorMap, preferences } = useUserTimetable();

  const shareLink = `https://nthumods.com/timetable/view?${Object.keys(courses)
    .map(
      (sem) =>
        `semester_${sem}=${courses[sem].map((id) => encodeURI(id)).join(",")}`,
    )
    .join("&")}&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  const apiBase = import.meta.env.VITE_COURSEWEB_API_URL;
  const visibleCourseIds = filterHiddenCourseIds(
    courses[semester] ?? [],
    preferences.hiddenCourses,
  );
  const icsQuery = `semester=${semester}&semester_${semester}=${visibleCourseIds.map((id) => encodeURI(id)).join(",")}`;
  const webcalLink = `${apiBase.replace(/^https?/, "webcals")}/timetable/calendar.ics?${icsQuery}`;
  const icsfileLink = `${apiBase}/timetable/calendar.ics?${icsQuery}`;

  return (
    <div className="flex flex-row justify-stretch gap-2 pt-2">
      <DownloadTimetableDialogDynamic icsfileLink={icsfileLink} />
      <ShareSyncTimetableDialogDynamic
        shareLink={shareLink}
        webcalLink={webcalLink}
      />
      <GroupByDepartmentButton semester={semester} />
    </div>
  );
};

export default TimetableBottomBar;
