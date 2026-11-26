import {
  Repeat,
  Plus,
  EllipsisVertical,
  Share2,
  Calendar,
  Globe,
  Users,
  ChevronRight,
  Download,
  CalendarClock,
  Trash,
} from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useNavigate, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@courseweb/ui";
import {
  DownloadTimetableDialogDynamic,
  ShareTimetableDialogDynamic,
  CourseSearchContainerDynamic,
  TimetableCourseList,
  TIMETABLE_ICON_BUTTON,
} from "./TimetableCourseList";
import CalendarSubscriptionLinks from "./CalendarSubscriptionLinks";
import OpenCollectiveSponsorBanner from "../Sponsorship/OpenCollectiveSponsorBanner";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { useTimetableShare } from "@/hooks/useTimetableShare";
import { toPrettySemester } from "@/helpers/semester";
import { useMemo } from "react";
import { TimetableCustomItemDrawer } from "./TimetableItemDrawer";
import {
  CUSTOM_TIMETABLE_DAYS,
  type CustomTimetableDay,
  CustomTimetableItem,
} from "@/types/timetable";
import {
  canSortTimetableCourses,
  reorderStoredCourseIdsByCredits,
} from "@/helpers/timetable";
import { groupColorsByDepartment } from "@/helpers/timetableColors";
import { filterHiddenCourseIds } from "@/helpers/timetableVisibility";
import { toWebcalCalendarFeedUrl } from "@/lib/calendar-subscription";

const createEmptyCustomItem = (color: string): CustomTimetableItem => ({
  // crypto.randomUUID rather than Math.random: the project already moved its
  // other generated ids onto a cryptographic source, and this one is persisted
  // and shared in timetable share payloads.
  id: `custom-${crypto.randomUUID()}`,
  title: "",
  color,
  slots: [{ day: 0, start: "08:00", end: "08:50" }],
});

// Filled controls, matching the course search toolbar.
const PRIMARY_ACTION = "h-9 w-full bg-surface hover:bg-muted";

const formatCustomItemSlots = (
  item: CustomTimetableItem,
  dayLabels: Record<CustomTimetableDay, string>,
) =>
  item.slots
    .map((slot) => {
      const day = CUSTOM_TIMETABLE_DAYS[slot.day];
      return `${day ? dayLabels[day] : ""} ${slot.start}–${slot.end}`.trim();
    })
    .join("、");

const TimetableSidebar = ({
  vertical,
  setVertical,
}: {
  vertical: boolean;
  setVertical: (v: boolean) => void;
}) => {
  const dict = useDictionary();

  const {
    semester,
    getSemesterCourses,
    courses,
    setCourses,
    setColorMap,
    currentColors,
    semesterCustomItems,
    addCustomItem,
    updateCustomItem,
    deleteCustomItem,
    isLoading,
    isFetchingCourses,
    error,
    preferences,
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
  const visibleCourseIds = filterHiddenCourseIds(
    courses[semester] ?? [],
    preferences.hiddenCourses,
  );
  const icsQuery = `semester=${semester}&semester_${semester}=${visibleCourseIds.map((id) => encodeURI(id)).join(",")}`;
  const icsfileLink = `${apiBase}/timetable/calendar.ics?${icsQuery}`;
  const webcalLink = toWebcalCalendarFeedUrl(icsfileLink);

  const handleGroupByDepartment = (semester: string) => {
    const semesterCourses = getSemesterCourses(semester);
    setColorMap((previousColorMap) =>
      groupColorsByDepartment(previousColorMap, semesterCourses, currentColors),
    );
  };

  const sortByCredits = (semester: string) => {
    if (!canSortTimetableCourses(isLoading || isFetchingCourses, error)) return;
    setCourses((currentCourses) => {
      const sortedCourseIds = reorderStoredCourseIdsByCredits(
        currentCourses[semester] ?? [],
        getSemesterCourses(semester),
      );
      return {
        ...currentCourses,
        [semester]: sortedCourseIds,
      };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className={PRIMARY_ACTION}>
              <Plus aria-hidden="true" />
              {dict.course.item.add_to_semester}
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 h-[100dvh] max-w-screen w-screen gap-0 px-2 pt-6 md:p-8">
            <DialogTitle className="sr-only">
              {dict.course.item.add_to_semester}
            </DialogTitle>
            <CourseSearchContainerDynamic />
          </DialogContent>
        </Dialog>
        <TimetableCustomItemDrawer
          item={emptyCustomItem}
          onSave={addCustomItem}
        >
          <Button variant="ghost" className={PRIMARY_ACTION}>
            <CalendarClock aria-hidden="true" />
            {dict.timetable.custom_items.add}
          </Button>
        </TimetableCustomItemDrawer>
      </div>

      {/* Course list — the main content; its toolbar holds every utility */}
      <TimetableCourseList
        semester={semester}
        vertical={vertical}
        afterList={
          semesterCustomItems.length > 0 && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                {dict.timetable.custom_items.title}
              </span>
              <div className="flex flex-col divide-y divide-border">
                {semesterCustomItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 py-2">
                    <TimetableCustomItemDrawer
                      item={item}
                      onSave={updateCustomItem}
                      onDelete={() => deleteCustomItem(item.id)}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        {/* Same footprint as the course rows' colour/drag handle, so
                        titles line up (touch screens add a grip there). */}
                        <span className="-my-1 -ml-1 flex h-8 shrink-0 items-center gap-1 px-1">
                          <span className="flex h-4 w-4 items-center justify-center">
                            <span
                              className="block h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="hidden w-4 [@media(hover:none)]:block" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium leading-6">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[
                              formatCustomItemSlots(
                                item,
                                dict.timetable.custom_items.days,
                              ),
                              item.venue,
                            ]
                              .filter(Boolean)
                              .join("・")}
                          </span>
                        </span>
                      </button>
                    </TimetableCustomItemDrawer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`${TIMETABLE_ICON_BUTTON} hover:text-destructive`}
                      onClick={() => deleteCustomItem(item.id)}
                      aria-label={dict.timetable.custom_items.delete}
                      title={dict.timetable.custom_items.delete}
                    >
                      <Trash />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        toolbar={
          <>
            <Button
              variant="ghost"
              size="icon"
              className={TIMETABLE_ICON_BUTTON}
              aria-label={
                vertical
                  ? dict.timetable.actions.horizontal_view
                  : dict.timetable.actions.vertical_view
              }
              title={
                vertical
                  ? dict.timetable.actions.horizontal_view
                  : dict.timetable.actions.vertical_view
              }
              onClick={() => setVertical(!vertical)}
            >
              <Repeat aria-hidden="true" />
            </Button>

            <DownloadTimetableDialogDynamic icsfileLink={icsfileLink}>
              <Button
                variant="ghost"
                size="icon"
                className={TIMETABLE_ICON_BUTTON}
                aria-label={dict.timetable.sidebar.download_export}
                title={dict.timetable.sidebar.download_export}
              >
                <Download aria-hidden="true" />
              </Button>
            </DownloadTimetableDialogDynamic>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={TIMETABLE_ICON_BUTTON}
                  aria-label={dict.timetable.sidebar.subscribe_calendar}
                  title={dict.timetable.sidebar.subscribe_calendar}
                >
                  <Calendar aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                aria-label={dict.timetable.sidebar.subscribe_calendar}
              >
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-medium">
                    {dict.timetable.sidebar.subscribe_calendar}
                  </p>
                  <div className="flex flex-col space-y-2">
                    <CalendarSubscriptionLinks feedUrl={webcalLink} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <ShareTimetableDialogDynamic>
              <Button
                variant="ghost"
                size="icon"
                className={TIMETABLE_ICON_BUTTON}
                aria-label={dict.timetable.sidebar.share_timetable}
                title={dict.timetable.sidebar.share_timetable}
              >
                <Share2 aria-hidden="true" />
              </Button>
            </ShareTimetableDialogDynamic>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={TIMETABLE_ICON_BUTTON}
                  aria-label={dict.timetable.sidebar.customizations}
                >
                  <EllipsisVertical aria-hidden="true" />
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
                <DropdownMenuItem
                  disabled={
                    !canSortTimetableCourses(
                      isLoading || isFetchingCourses,
                      error,
                    )
                  }
                  onClick={() => sortByCredits(semester)}
                >
                  {dict.timetable.actions.sort_by_credits}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/${lang}/timetable/community`)}
              className="ml-auto h-8 gap-1 px-2 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <Globe aria-hidden="true" />
              {dict.timetable.sidebar.community}
            </Button>
          </>
        }
      />

      {/* Groups section — only when signed in */}
      {isAuthenticated && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">
              {dict.timetable.sidebar.groups}
            </span>
            <ShareTimetableDialogDynamic initialTab="groups">
              <Button
                variant="ghost"
                size="icon"
                className={TIMETABLE_ICON_BUTTON}
                title={dict.timetable.sidebar.create_group}
                aria-label={dict.timetable.sidebar.create_group}
              >
                <Plus />
              </Button>
            </ShareTimetableDialogDynamic>
          </div>
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
        </div>
      )}

      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default TimetableSidebar;
