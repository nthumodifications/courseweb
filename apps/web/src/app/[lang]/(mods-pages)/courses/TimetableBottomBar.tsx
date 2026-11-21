import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  DownloadTimetableDialogDynamic,
  ShareSyncTimetableDialogDynamic,
} from "@/components/Timetable/TimetableCourseList";
import GroupByDepartmentButton from "@/components/Timetable/GroupByDepartmentButton";
import { filterHiddenCourseIds } from "@/helpers/timetableVisibility";
import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@courseweb/ui";
import { Download, Palette, Share } from "lucide-react";

// Three equal soft-grey buttons so all three labels fit the 300px panel.
const ACTION_CLASS =
  "h-9 w-full min-w-0 gap-1 bg-surface px-2 text-xs font-medium hover:bg-muted";

const TimetableBottomBar = () => {
  const dict = useDictionary();
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
    <div className="grid grid-cols-3 gap-2 pt-2">
      <DownloadTimetableDialogDynamic icsfileLink={icsfileLink}>
        <Button variant="ghost" className={ACTION_CLASS}>
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{dict.timetable.actions.download}</span>
        </Button>
      </DownloadTimetableDialogDynamic>
      <ShareSyncTimetableDialogDynamic
        shareLink={shareLink}
        webcalLink={webcalLink}
      >
        <Button variant="ghost" className={ACTION_CLASS}>
          <Share className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{dict.timetable.actions.share}</span>
        </Button>
      </ShareSyncTimetableDialogDynamic>
      <GroupByDepartmentButton
        semester={semester}
        className={ACTION_CLASS}
        aria-label={dict.timetable.actions.group_dept}
      >
        <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {dict.timetable.actions.group_dept_short}
        </span>
      </GroupByDepartmentButton>
    </div>
  );
};

export default TimetableBottomBar;
