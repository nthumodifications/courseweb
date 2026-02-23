import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  DownloadTimetableDialogDynamic,
  ShareSyncTimetableDialogDynamic,
} from "@/components/Timetable/TimetableCourseList";
import GroupByDepartmentButton from "@/components/Timetable/GroupByDepartmentButton";

const TimetableBottomBar = () => {
  const { semester, courses, colorMap } = useUserTimetable();

  const shareLink = `https://nthumods.com/timetable/view?${Object.keys(courses)
    .map(
      (sem) =>
        `semester_${sem}=${courses[sem].map((id) => encodeURI(id)).join(",")}`,
    )
    .join("&")}&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  const webcalLink = `webcals://api.nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`}`;
  const icsfileLink = `https://api.nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`}`;

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
