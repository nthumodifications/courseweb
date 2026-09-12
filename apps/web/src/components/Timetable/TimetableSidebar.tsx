import {
  Repeat,
  Plus,
  EllipsisVertical,
  Share2,
  Globe,
  Users,
  ChevronRight,
  Download,
  CalendarClock,
  Trash2,
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
import { Section } from "@courseweb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { useTimetableShare } from "@/hooks/useTimetableShare";
import { toPrettySemester } from "@/helpers/semester";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import Compact from "@uiw/react-color-compact";
import { useMemo } from "react";
import { TimetableCustomItemDrawer } from "./TimetableItemDrawer";
import { CustomTimetableItem } from "@/types/timetable";

const createEmptyCustomItem = (color: string): CustomTimetableItem => ({
  // crypto.randomUUID rather than Math.random: the project already moved its
  // other generated ids onto a cryptographic source, and this one is persisted
  // and shared in timetable share payloads.
  id: `custom-${crypto.randomUUID()}`,
  title: "",
  color,
  slots: [{ day: 0, start: "08:00", end: "08:50" }],
});

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
    semesterCustomItems,
    addCustomItem,
    updateCustomItem,
    deleteCustomItem,
    setCustomItemColor,
  } = useUserTimetable();

  const emptyCustomItem = useMemo(
    () =>
      createEmptyCustomItem(
        currentColors[semesterCustomItems.length % currentColors.length] ??
          "#555555",
      ),
    [currentColors, semesterCustomItems.length],
  );

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

  const apiBase = import.meta.env.VITE_COURSEWEB_API_URL;
  const icsQuery = `semester=${semester}&semester_${semester}=${(courses[semester] ?? []).map((id) => encodeURI(id)).join(",")}`;
  const icsfileLink = `${apiBase}/timetable/calendar.ics?${icsQuery}`;

  const handleGroupByDepartment = (semester: string) => {
    const semesterCourses = getSemesterCourses(semester);
    const newColorMap = { ...colorMap };
    const departments = semesterCourses.reduce((acc, course) => {
      if (!acc.includes(course.department)) acc.push(course.department);
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
    <div className="flex min-w-0 flex-col gap-6">
      <Section title={dict.timetable.sections.actions}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Dialog>
            <DialogTitle className="hidden">
              {dict.course.item.add_to_semester}
            </DialogTitle>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {dict.course.item.add_to_semester}
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 h-[100dvh] max-w-screen w-screen gap-0 px-2 pt-6 md:p-8">
              <CourseSearchContainerDynamic />
            </DialogContent>
          </Dialog>
          <TimetableCustomItemDrawer
            item={emptyCustomItem}
            onSave={addCustomItem}
          >
            <Button variant="outline" className="w-full">
              <CalendarClock className="w-4 h-4 mr-2" />
              {dict.timetable.custom_items.add}
            </Button>
          </TimetableCustomItemDrawer>
        </div>
      </Section>

      {semesterCustomItems.length > 0 && (
        <Section title={dict.timetable.custom_items.title}>
          <div className="flex flex-col gap-1">
            {semesterCustomItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-md hover:outline outline-1 outline-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={dict.timetable.custom_items.color_label}
                    >
                      <span
                        className="block h-4 w-4 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto">
                    <Compact
                      color={item.color}
                      onChange={(color) =>
                        setCustomItemColor(item.id, color.hex)
                      }
                      colors={currentColors}
                    />
                  </PopoverContent>
                </Popover>
                <TimetableCustomItemDrawer
                  item={item}
                  onSave={updateCustomItem}
                  onDelete={() => deleteCustomItem(item.id)}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left rounded-md px-2 py-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className="block text-sm truncate">{item.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {item.shortCode ||
                        item.venue ||
                        dict.timetable.custom_items.custom_label}
                    </span>
                  </button>
                </TimetableCustomItemDrawer>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => deleteCustomItem(item.id)}
                  aria-label={dict.timetable.custom_items.delete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Course list — the main content */}
      <TimetableCourseList semester={semester} vertical={vertical} />

      {/* Groups section — only when signed in */}
      {isAuthenticated && (
        <Section
          title={dict.timetable.sidebar.groups}
          actions={
            <ShareTimetableDialogDynamic initialTab="groups">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                title={dict.timetable.sidebar.create_group}
                aria-label={dict.timetable.sidebar.create_group}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </ShareTimetableDialogDynamic>
          }
        >
          {myGroups.length === 0 ? (
            <ShareTimetableDialogDynamic initialTab="groups">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground px-1 py-1 text-left transition-colors"
              >
                + {dict.timetable.sidebar.create_or_join_group}
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
                    {group.members.length !== 1
                      ? dict.timetable.sidebar.members
                      : dict.timetable.sidebar.member}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </Section>
      )}

      <Section title={dict.timetable.sections.share_export}>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            title={
              vertical
                ? dict.timetable.actions.horizontal_view
                : dict.timetable.actions.vertical_view
            }
            aria-label={
              vertical
                ? dict.timetable.actions.horizontal_view
                : dict.timetable.actions.vertical_view
            }
            onClick={() => setVertical(!vertical)}
          >
            <Repeat className="w-4 h-4" />
          </Button>

          <DownloadTimetableDialogDynamic icsfileLink={icsfileLink}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              title={dict.timetable.sidebar.download_export}
              aria-label={dict.timetable.sidebar.download_export}
            >
              <Download className="w-4 h-4" />
            </Button>
          </DownloadTimetableDialogDynamic>

          <ShareTimetableDialogDynamic>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              title={dict.timetable.sidebar.share_timetable}
              aria-label={dict.timetable.sidebar.share_timetable}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </ShareTimetableDialogDynamic>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                title={dict.timetable.actions.more_options}
                aria-label={dict.timetable.actions.more_options}
              >
                <EllipsisVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                {dict.timetable.sidebar.customizations}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleGroupByDepartment(semester)}
              >
                {dict.timetable.actions.group_dept}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortByCredits(semester)}>
                {dict.timetable.actions.sort_by_credits}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => navigate(`/${lang}/timetable/community`)}
            className="ml-auto flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="w-3 h-3" />
            {dict.timetable.sidebar.community}
          </button>
        </div>
      </Section>
    </div>
  );
};

export default TimetableSidebar;
