import { Repeat, Plus, EllipsisVertical } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useRouter } from "next/navigation";
import ThemeChangableAlert from "../Alerts/ThemeChangableAlert";
import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DownloadTimetableDialogDynamic,
  ShareSyncTimetableDialogDynamic,
  HeadlessSyncCourseButtonDynamic,
  CourseSearchContainerDynamic,
  TimetableCourseList,
} from "./TimetableCourseList";
import GroupByDepartmentButton from "./GroupByDepartmentButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TimetableSidebar = ({
  vertical,
  setVertical,
}: {
  vertical: boolean;
  setVertical: (v: boolean) => void;
  hideSettings?: boolean;
}) => {
  const dict = useDictionary();

  const { semester, courses, colorMap } = useUserTimetable();

  const router = useRouter();

  const shareLink = `https://nthumods.com/timetable/view?${Object.keys(courses)
    .map(
      (sem) =>
        `semester_${sem}=${courses[sem].map((id) => encodeURI(id)).join(",")}`,
    )
    .join("&")}&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  const webcalLink = `webcals://nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`}`;
  const icsfileLink = `https://nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`}`;

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
            <DropdownMenuItem asChild>
              <HeadlessSyncCourseButtonDynamic />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <GroupByDepartmentButton semester={semester} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog>
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
      <ThemeChangableAlert />
    </div>
  );
};

export default TimetableSidebar;
