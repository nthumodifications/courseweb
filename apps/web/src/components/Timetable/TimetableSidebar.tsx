import { Repeat, Plus, EllipsisVertical } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useNavigate } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@courseweb/ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import {
  DownloadTimetableDialogDynamic,
  ShareSyncTimetableDialogDynamic,
  CourseSearchContainerDynamic,
  TimetableCourseList,
} from "./TimetableCourseList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import OpenCollectiveSponsorBanner from "../Sponsorship/OpenCollectiveSponsorBanner";

const TimetableSidebar = ({
  vertical,
  setVertical,
}: {
  vertical: boolean;
  setVertical: (v: boolean) => void;
  hideSettings?: boolean;
}) => {
  const dict = useDictionary();

  const {
    semester,
    getSemesterCourses,
    courses,
    setCourses,
    colorMap,
    setColorMap,
    currentColors,
  } = useUserTimetable();

  const navigate = useNavigate();

  const shareLink = `https://nthumods.com/timetable/view?${Object.keys(courses)
    .map(
      (sem) =>
        `semester_${sem}=${courses[sem].map((id) => encodeURI(id)).join(",")}`,
    )
    .join("&")}&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  const apiBase = import.meta.env.VITE_COURSEWEB_API_URL;
  const icsQuery = `semester=${semester}&semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`;
  const webcalLink = `${apiBase.replace(/^https?/, "webcals")}/timetable/calendar.ics?${icsQuery}`;
  const icsfileLink = `${apiBase}/timetable/calendar.ics?${icsQuery}`;

  const handleGroupByDepartment = (semester: string) => {
    const semesterCourses = getSemesterCourses(semester);
    const newColorMap = { ...colorMap };

    const departments = semesterCourses.reduce((acc, course) => {
      if (!acc.includes(course.department)) {
        acc.push(course.department);
      }
      return acc;
    }, [] as string[]);

    for (let i = 0; i < departments.length; i++) {
      const color = currentColors[i % currentColors.length];

      semesterCourses
        .filter((course) => course.department === departments[i])
        .forEach((course) => {
          newColorMap[course.raw_id] = color;
        });
    }

    setColorMap(newColorMap);
  };

  const sortByCredits = (semester: string) => {
    const semesterCourses = getSemesterCourses(semester);

    const sortedCourses = [...semesterCourses].sort(
      (a, b) => b.credits - a.credits,
    );

    setCourses({
      ...courses,
      [semester]: sortedCourses.map((course) => course.raw_id),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 grid-rows-2 gap-2">
        <Button variant="outline" onClick={() => setVertical(!vertical)}>
          <Repeat className="w-4 h-4 mr-1" />{" "}
          {vertical
            ? dict.timetable.actions.horizontal_view
            : dict.timetable.actions.vertical_view}
        </Button>
        <DownloadTimetableDialogDynamic icsfileLink={icsfileLink} />
        <ShareSyncTimetableDialogDynamic
          shareLink={shareLink}
          webcalLink={webcalLink}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <EllipsisVertical className="w-4 h-4 mr-2" />
              {dict.timetable.actions.more_options}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Customizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleGroupByDepartment(semester)}>
              {dict.timetable.actions.group_dept}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => sortByCredits(semester)}>
              {dict.timetable.actions.sort_by_credits}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog>
        <DialogTitle className="hidden">AddToSem</DialogTitle>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            {dict.course.item.add_to_semester}
          </Button>
        </DialogTrigger>
        <DialogContent className="p-0 h-[100dvh] max-w-screen w-screen gap-0 px-2 pt-6 md:p-8">
          <CourseSearchContainerDynamic />
        </DialogContent>
      </Dialog>
      <TimetableCourseList semester={semester} vertical={vertical} />
      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default TimetableSidebar;
