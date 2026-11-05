import {
  Search,
  AlertTriangle,
  Copy,
  GripVertical,
  Loader2,
  Settings,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { Link, useNavigate, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { Suspense, useMemo, useState } from "react";
import useSyncedStorage from "@/hooks/useSyncedStorage";
import {
  hasConflictingTimeslots,
  hasSameCourse,
  hasTimes,
} from "@/helpers/courses";
import { MinimalCourse } from "@/types/courses";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { getTimetableCourseListStatus } from "@/helpers/timetable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSwappingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import Compact from "@uiw/react-color-compact";
import { TimetableItemDrawer } from "./TimetableItemDrawer";
import { isCourseHidden } from "@/helpers/timetableVisibility";
import { UnresolvedCoursesNotice } from "./UnresolvedCoursesNotice";
import { lazyWithRetry } from "@/lib/chunk-recovery";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import {
  classPageKeys,
  classmatesPath,
  getClassPageCounts,
} from "@/lib/class-pages";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";

const DownloadTimetableDialogLazy = lazyWithRetry(
  () => import("./DownloadTimetableDialog"),
);
export const DownloadTimetableDialogDynamic = ({
  icsfileLink,
  children,
}: {
  icsfileLink: string;
  children?: React.ReactNode;
}) => {
  const dict = useDictionary();
  return (
    <Suspense
      fallback={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={dict.common.loading}
          disabled
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        </Button>
      }
    >
      <DownloadTimetableDialogLazy icsfileLink={icsfileLink}>
        {children}
      </DownloadTimetableDialogLazy>
    </Suspense>
  );
};

const ShareSyncTimetableDialogLazy = lazyWithRetry(
  () => import("./ShareSyncTimetableDialog"),
);
export const ShareSyncTimetableDialogDynamic = ({
  shareLink,
  webcalLink,
}: {
  shareLink: string;
  webcalLink: string;
}) => (
  <Suspense
    fallback={
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    }
  >
    <ShareSyncTimetableDialogLazy
      shareLink={shareLink}
      webcalLink={webcalLink}
    />
  </Suspense>
);

const CourseSearchContainerLazy = lazyWithRetry(
  () => import("@/app/[lang]/(mods-pages)/courses/CourseSearchContainer"),
);
export const CourseSearchContainerDynamic = () => (
  <Suspense fallback={<Loader2 className="w-4 h-4 animate-spin" />}>
    <CourseSearchContainerLazy />
  </Suspense>
);

const ShareTimetableDialogLazy = lazyWithRetry(
  () => import("./ShareTimetableDialog"),
);
export const ShareTimetableDialogDynamic = ({
  children,
  initialTab,
}: {
  children: React.ReactNode;
  initialTab?: "create" | "manage" | "groups";
}) => (
  <Suspense
    fallback={
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    }
  >
    <ShareTimetableDialogLazy initialTab={initialTab}>
      {children}
    </ShareTimetableDialogLazy>
  </Suspense>
);

interface DisplaySettings {
  englishNames: "add" | "replace" | "none";
  showCourseCode: boolean;
  showVenue: boolean;
  showPriority: boolean;
  showCredits: boolean;
  lockOrder: boolean;
}

const TimetableCourseListItem = ({
  course,
  hasConflict,
  isDuplicate,
  priority,
  displaySettings,
  semester,
  classPageCounts,
  vertical,
}: {
  course: MinimalCourse;
  hasConflict: boolean;
  isDuplicate: boolean;
  priority: number;
  displaySettings: DisplaySettings;
  semester: string;
  classPageCounts?: Record<string, { members: number; joined: boolean }>;
  vertical: boolean;
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { lang } = useParams<{ lang: string }>();
  const localizeData = useLocalizedZhData();
  const navigate = useNavigate();
  const {
    deleteCourse,
    colorMap,
    setColor,
    currentColors,
    preferences,
    setPreferences,
  } = useUserTimetable();
  const isHidden = isCourseHidden(course.raw_id, preferences.hiddenCourses);
  const copy = dict.timetable.course_item;
  const classmatesHref = classmatesPath(
    lang ?? language,
    semester,
    course.raw_id,
  );
  const classmates = classPageCounts?.[course.raw_id];
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: course.raw_id, disabled: displaySettings.lockOrder });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const courseName =
    displaySettings.englishNames === "replace"
      ? course.name_en
      : localizeData(course.name_zh);
  const showEnglishName =
    displaySettings.englishNames === "add" && Boolean(course.name_en);
  const courseCode = displaySettings.showCourseCode
    ? `${course.department} ${course.course}${course.class.padStart(2, "0")}`
    : undefined;
  const courseTimes = hasTimes(course)
    ? course.times.join(", ")
    : dict.course.details.missing_time;
  const courseVenue = displaySettings.showVenue
    ? course.venues.map(localizeData).filter(Boolean).join(", ") || undefined
    : undefined;
  const courseCredits = displaySettings.showCredits
    ? `${course.credits} ${dict.course.credits}`
    : undefined;
  const coursePriority =
    displaySettings.showPriority && priority > 0
      ? copy.priority.replace("{priority}", String(priority))
      : undefined;
  const meta = [
    courseCode,
    courseTimes,
    courseVenue,
    courseCredits,
    coursePriority,
  ].filter((value): value is string => Boolean(value));

  const toggleHidden = () => {
    return setPreferences((previous) => {
      const hiddenCourses = { ...previous.hiddenCourses };
      if (isCourseHidden(course.raw_id, hiddenCourses)) {
        delete hiddenCourses[course.raw_id];
      } else {
        hiddenCourses[course.raw_id] = true;
      }
      return { ...previous, hiddenCourses };
    });
  };

  return (
    <div
      className={`group min-w-0 ${vertical ? "" : "border-b border-border"} ${isHidden ? "opacity-60" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <TimetableItemDrawer course={course}>
        <div className="flex min-w-0 flex-row items-center gap-2 px-2 py-2">
          <div className="flex shrink-0 flex-row items-center gap-1">
            {!displaySettings.lockOrder && (
              <button
                type="button"
                className="flex h-6 w-4 items-center justify-center text-muted-foreground opacity-0 focus-visible:opacity-100 md:group-hover:opacity-100"
                aria-label={copy.move_course}
                {...attributes}
                {...listeners}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  listeners?.onKeyDown?.(event);
                }}
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-6 w-4 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={copy.change_color}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: colorMap[course.raw_id] }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="p-1"
                aria-label={copy.change_color}
                onClick={(event) => event.stopPropagation()}
              >
                <Compact
                  color={colorMap[course.raw_id]}
                  onChange={(color) => setColor(course.raw_id, color.hex)}
                  colors={currentColors}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1 truncate font-bold">
              <span className="truncate">{courseName}</span>
              {showEnglishName && (
                <span className="truncate font-medium text-muted-foreground">
                  {language === "en" ? " · " : " ・ "}
                  {course.name_en}
                </span>
              )}
            </div>
            <div className="min-h-4 min-w-0 truncate whitespace-nowrap text-xs text-muted-foreground">
              {meta.map((item, index) => (
                <span key={`${index}-${item}`}>
                  {index > 0 && <span aria-hidden="true"> ・ </span>}
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasConflict && (
              <span
                className="inline-flex h-6 w-4 items-center justify-center text-destructive"
                role="img"
                aria-label={dict.timetable.conflict}
                title={dict.timetable.conflict}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            {isDuplicate && (
              <span
                className="inline-flex h-6 w-4 items-center justify-center text-accent-foreground"
                role="img"
                aria-label={dict.timetable.duplicate}
                title={dict.timetable.duplicate}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <Link
              to={classmatesHref}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm hover:bg-accent ${classmates?.joined ? "text-foreground" : "text-muted-foreground"}`}
              aria-label={
                classmates
                  ? copy.classmates_count.replace(
                      "{count}",
                      String(classmates.members),
                    )
                  : copy.classmates
              }
              title={copy.classmates}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              {classmates && <span>{classmates.members}</span>}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={copy.more_actions}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => navigate(classmatesHref)}>
                  <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                  {copy.classmates}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleHidden}>
                  {isHidden ? copy.show : copy.hide}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setColorPickerOpen(true)}>
                  {copy.change_color}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteCourse(course.raw_id)}
                >
                  {copy.remove}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TimetableItemDrawer>
    </div>
  );
};

export const TimetableCourseList = ({
  semester,
  vertical = true,
}: {
  semester: string;
  vertical?: boolean;
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const navigate = useNavigate();
  const auth = useAuth();

  const {
    getSemesterCourses,
    getSemesterUnresolvedCourseIds,
    setCourses,
    isLoading,
    isFetchingCourses,
    error,
  } = useUserTimetable();

  const defaultSettings: DisplaySettings = {
    englishNames: "add",
    showCourseCode: false,
    showVenue: true,
    showPriority: true,
    showCredits: true,
    lockOrder: false,
  };

  const [displaySettings, setDisplaySettings] =
    useSyncedStorage<DisplaySettings>(
      "timetable-display-settings",
      defaultSettings,
    );

  const displayCourseData = useMemo(
    () => getSemesterCourses(semester),
    [getSemesterCourses, semester],
  );

  const accessToken = auth.user?.access_token;
  const classPageCountsQuery = useQuery({
    queryKey: classPageKeys.counts(semester),
    queryFn: () => getClassPageCounts(accessToken!, semester),
    enabled: Boolean(auth.isAuthenticated && accessToken),
    retry: false,
    staleTime: 60_000,
  });
  // Counts are optional row context. If signed out or the request fails, the
  // classmates entry remains available without showing a stale count.
  const classPageCounts =
    auth.isAuthenticated && accessToken && !classPageCountsQuery.isError
      ? classPageCountsQuery.data
      : undefined;

  const totalCredits = useMemo(() => {
    return displayCourseData.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
  }, [displayCourseData]);
  const unresolvedCourseIds = getSemesterUnresolvedCourseIds(semester);
  const listStatus = getTimetableCourseListStatus(
    isLoading,
    error,
    displayCourseData.length,
    unresolvedCourseIds.length,
  );

  const duplicates = useMemo(
    () => hasSameCourse(displayCourseData as MinimalCourse[]),
    [displayCourseData],
  );

  const timeConflicts = useMemo(
    () => hasConflictingTimeslots(displayCourseData as MinimalCourse[]),
    [displayCourseData],
  );
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const peAndGeAllocation = useMemo(() => {
    const peAndGe = displayCourseData.filter((course) => {
      if (course.department == "PE" && course.course != "PE 1110") {
        return true;
      }
      if (course.ge_target && course.ge_target != " ") {
        return true;
      }
      return false;
    });

    return peAndGe.map((course) => course.raw_id);
  }, [displayCourseData]);

  function handleDragEnd(event: DragEndEvent) {
    if (displaySettings.lockOrder) return;

    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setCourses((currentCourses) => {
        const courseCopy = [...(currentCourses[semester] ?? [])];
        const oldIndex = courseCopy.indexOf(active.id as string);
        const newIndex = courseCopy.indexOf(over.id as string);
        if (oldIndex < 0 || newIndex < 0) return currentCourses;
        return {
          ...currentCourses,
          [semester]: arrayMove(courseCopy, oldIndex, newIndex),
        };
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[
            vertical ? restrictToVerticalAxis : restrictToWindowEdges,
          ]}
        >
          <SortableContext
            items={displayCourseData.map((course) => course.raw_id)}
            strategy={
              vertical ? verticalListSortingStrategy : rectSwappingStrategy
            }
          >
            <div
              className={`min-w-0 ${
                vertical
                  ? "flex flex-col divide-y divide-border"
                  : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {displayCourseData.map((course) => (
                <TimetableCourseListItem
                  key={course.raw_id}
                  course={course as MinimalCourse}
                  hasConflict={timeConflicts.some(
                    (ts) => ts.course.raw_id == course.raw_id,
                  )}
                  isDuplicate={duplicates.includes(course.raw_id)}
                  priority={peAndGeAllocation.indexOf(course.raw_id) + 1}
                  displaySettings={displaySettings}
                  semester={semester}
                  classPageCounts={classPageCounts}
                  vertical={vertical}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {listStatus === "loading" && (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {dict.timetable.course_data_loading}
          </div>
        )}
        {listStatus === "error" && (
          <div
            className="flex items-center gap-2 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {dict.timetable.course_data_error}
          </div>
        )}
        {unresolvedCourseIds.length > 0 &&
          !isFetchingCourses &&
          listStatus !== "loading" &&
          listStatus !== "error" && (
            <UnresolvedCoursesNotice count={unresolvedCourseIds.length} />
          )}
        {listStatus === "empty" && (
          <div className="flex flex-row flex-wrap items-center gap-2 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {dict.timetable.no_courses}
            </span>
            <Button
              variant="outline"
              onClick={() => navigate(`/${language}/courses`)}
            >
              <Search className="w-4 h-4" /> {dict.timetable.all_courses}
            </Button>
          </div>
        )}
      </div>
      <Separator orientation="horizontal" />
      <div className="flex flex-row justify-between items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="flex gap-1">
              <Settings className="h-4 w-4" />
              {dict.timetable.display_settings}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-4 p-2">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="english-names">
                  {dict.timetable.english_names}
                </Label>
                <Select
                  value={displaySettings.englishNames}
                  onValueChange={(value) =>
                    setDisplaySettings({
                      ...displaySettings,
                      englishNames: value as "add" | "replace" | "none",
                    })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={dict.timetable.select_display} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">
                      {dict.timetable.english_names_options.add}
                    </SelectItem>
                    <SelectItem value="replace">
                      {dict.timetable.english_names_options.replace}
                    </SelectItem>
                    <SelectItem value="none">
                      {dict.timetable.english_names_options.hide}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-course-code">
                  {dict.timetable.show_course_code}
                </Label>
                <Switch
                  id="show-course-code"
                  checked={displaySettings.showCourseCode}
                  onCheckedChange={(checked) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showCourseCode: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-venue">{dict.timetable.show_venue}</Label>
                <Switch
                  id="show-venue"
                  checked={displaySettings.showVenue}
                  onCheckedChange={(checked) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showVenue: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-credits">
                  {dict.timetable.show_credits}
                </Label>
                <Switch
                  id="show-credits"
                  checked={displaySettings.showCredits}
                  onCheckedChange={(checked) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showCredits: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-priority">
                  {dict.timetable.show_priority}
                </Label>
                <Switch
                  id="show-priority"
                  checked={displaySettings.showPriority}
                  onCheckedChange={(checked) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showPriority: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="lock-order">{dict.timetable.lock_order}</Label>
                <Switch
                  id="lock-order"
                  checked={displaySettings.lockOrder}
                  onCheckedChange={(checked) =>
                    setDisplaySettings({
                      ...displaySettings,
                      lockOrder: checked,
                    })
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplaySettings(defaultSettings)}
              >
                {dict.timetable.reset_default}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex flex-row gap-4">
          <div className="space-x-2">
            <span className="font-bold">{displayCourseData.length}</span>
            <span className="text-muted-foreground">
              {dict.timetable.course}
            </span>
          </div>
          <div className="space-x-2">
            <span className="font-bold">{totalCredits}</span>
            <span className="text-muted-foreground">
              {dict.timetable.credits}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TimetableCourseList;
