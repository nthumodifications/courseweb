import {
  Repeat,
  Plus,
  EllipsisVertical,
  Share2,
  Globe,
  Users,
  ChevronRight,
} from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useNavigate, useParams } from "react-router-dom";
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
  ShareTimetableDialogDynamic,
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
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { useTimetableShare } from "@/hooks/useTimetableShare";
import { toPrettySemester } from "@/helpers/semester";

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
  const { lang } = useParams<{ lang: string }>();
  const { isAuthenticated } = useAuth();
  const { listMyGroups } = useTimetableShare();
  const { data: myGroups = [] } = useQuery({
    queryKey: ["my-groups"],
    queryFn: listMyGroups,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

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
        <ShareTimetableDialogDynamic>
          <Button variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </ShareTimetableDialogDynamic>
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
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate(`/${lang}/timetable/community`)}
      >
        <Globe className="w-4 h-4 mr-2" />
        Community Timetables
      </Button>

      {isAuthenticated && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Groups
            </span>
            <ShareTimetableDialogDynamic initialTab="groups">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Create a group"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </ShareTimetableDialogDynamic>
          </div>
          {myGroups.length === 0 ? (
            <ShareTimetableDialogDynamic initialTab="groups">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground px-1 py-1 text-left transition-colors"
              >
                + Create or join a group
              </button>
            </ShareTimetableDialogDynamic>
          ) : (
            myGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left w-full"
                onClick={() =>
                  navigate(`/${lang}/timetable/group/${group.inviteCode}`)
                }
              >
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {toPrettySemester(group.semester)} · {group.members.length}{" "}
                    member{group.members.length !== 1 ? "s" : ""}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      )}

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
