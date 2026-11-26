import {
  Search,
  Trash,
  AlertTriangle,
  GripVertical,
  Loader2,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useNavigate } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { Suspense, useMemo, type ReactNode } from "react";
import useSyncedStorage from "@/hooks/useSyncedStorage";
import { hasSameCourse } from "@/helpers/courses";
import { MinimalCourse } from "@/types/courses";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { TimetableItemDrawer } from "./TimetableItemDrawer";
import { isCourseHidden } from "@/helpers/timetableVisibility";
import { UnresolvedCoursesNotice } from "./UnresolvedCoursesNotice";
import CourseListItem from "@/components/Courses/CourseListItem";
import type { CourseDefinition } from "@/config/supabase";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { decodeCourseText } from "@/lib/course-text";
import { getFavouriteCourseConflicts } from "@/app/[lang]/(mods-pages)/courses/favouriteCourseConflicts";
import { lazyWithRetry } from "@/lib/chunk-recovery";

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
  children,
}: {
  shareLink: string;
  webcalLink: string;
  children?: React.ReactNode;
}) => (
  <Suspense
    fallback={
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    }
  >
    <ShareSyncTimetableDialogLazy shareLink={shareLink} webcalLink={webcalLink}>
      {children}
    </ShareSyncTimetableDialogLazy>
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

// Ghost icon buttons used on every row and in the toolbar, so the panel has
// one button style.
export const TIMETABLE_ICON_BUTTON =
  "h-8 w-8 text-muted-foreground hover:bg-surface hover:text-foreground";

/**
 * The course colour doubles as the drag handle: it shows the colour, and
 * turns into a grip while the row is hovered or the handle is focused.
 * Colour itself is changed inside the course dialog.
 */
const ColorDragHandle = ({
  color,
  draggable,
  label,
  handleProps,
}: {
  color?: string;
  draggable: boolean;
  label: string;
  handleProps: Record<string, unknown>;
}) => {
  const dot = (
    <span
      className="block h-3 w-3 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
  if (!draggable)
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {dot}
      </span>
    );
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="group/handle flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      onClick={(event) => event.stopPropagation()}
      {...handleProps}
    >
      <span className="group-hover/row:hidden group-focus-visible/handle:hidden">
        {dot}
      </span>
      <GripVertical
        className="hidden h-4 w-4 group-hover/row:block group-focus-visible/handle:block"
        aria-hidden="true"
      />
    </button>
  );
};

const TimetableCourseListItem = ({
  course,
  conflictNames,
  isDuplicate,
  priority,
  displaySettings,
}: {
  course: MinimalCourse;
  conflictNames: string[];
  isDuplicate: boolean;
  priority: number;
  displaySettings: DisplaySettings;
}) => {
  const dict = useDictionary();
  const { language } = useSettings();

  const { deleteCourse, colorMap, preferences, setPreferences } =
    useUserTimetable();
  const isHidden = isCourseHidden(course.raw_id, preferences.hiddenCourses);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: course.raw_id, disabled: displaySettings.lockOrder });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const visibilityLabel = isHidden
    ? dict.timetable.course_actions.show_course
    : dict.timetable.course_actions.hide_course;

  return (
    <div
      className={`group/row min-w-0 max-w-3xl py-2 ${isHidden ? "text-muted-foreground" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <TimetableItemDrawer course={course}>
        <div className="min-w-0">
          <CourseListItem
            course={course as CourseDefinition}
            englishNames={displaySettings.englishNames}
            showCourseCode={displaySettings.showCourseCode}
            showVenue={displaySettings.showVenue}
            showCredits={displaySettings.showCredits}
            showPriority={false}
            showSyllabusDetails={false}
            showEnrollment={false}
            showAdditionalTags={false}
            showChevron={false}
            compact
            alignSideItemsTop
            actionsAfterTags
            priority={priority}
            missingTimeLabel={dict.course.details.missing_time}
            dimmed={isHidden}
            onCourseClick={() => undefined}
            timeConflict={
              conflictNames.length > 0
                ? dict.timetable.conflict_with.replace(
                    "{courses}",
                    conflictNames.join(language === "en" ? ", " : "、"),
                  )
                : undefined
            }
            notice={isDuplicate ? dict.timetable.duplicate : undefined}
            leading={
              <ColorDragHandle
                color={colorMap[course.raw_id]}
                draggable={!displaySettings.lockOrder}
                label={dict.timetable.drag_to_reorder}
                handleProps={{ ...attributes, ...listeners }}
              />
            }
            actions={
              <div
                className="flex flex-row items-center"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={TIMETABLE_ICON_BUTTON}
                  title={visibilityLabel}
                  aria-label={visibilityLabel}
                  aria-pressed={isHidden}
                  onClick={() =>
                    setPreferences((previous) => {
                      const hiddenCourses = { ...previous.hiddenCourses };
                      if (isCourseHidden(course.raw_id, hiddenCourses)) {
                        delete hiddenCourses[course.raw_id];
                      } else {
                        hiddenCourses[course.raw_id] = true;
                      }
                      return { ...previous, hiddenCourses };
                    })
                  }
                >
                  {isHidden ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`${TIMETABLE_ICON_BUTTON} hover:text-destructive`}
                  title={dict.course.item.remove_from_semester}
                  aria-label={dict.course.item.remove_from_semester}
                  onClick={() => deleteCourse(course.raw_id)}
                >
                  <Trash />
                </Button>
              </div>
            }
          />
        </div>
      </TimetableItemDrawer>
    </div>
  );
};

export const TimetableCourseList = ({
  semester,
  vertical = true,
  toolbar,
  afterList,
}: {
  semester: string;
  vertical?: boolean;
  /** Extra icon buttons for the bottom toolbar, after display settings. */
  toolbar?: ReactNode;
  /** A section shown between the course list and the toolbar. */
  afterList?: ReactNode;
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const navigate = useNavigate();

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

  const localizeData = useLocalizedZhData();
  const conflictNamesById = useMemo(() => {
    const semesterCourses = displayCourseData as MinimalCourse[];
    return new Map(
      semesterCourses.map((course) => [
        course.raw_id,
        getFavouriteCourseConflicts(course, semesterCourses).map((conflict) =>
          language === "en"
            ? decodeCourseText(conflict.name_en)
            : localizeData(decodeCourseText(conflict.name_zh)),
        ),
      ]),
    );
  }, [displayCourseData, language, localizeData]);
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
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {dict.timetable.courses_heading}
        </span>
        {displayCourseData.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {dict.timetable.course_count.replace(
              "{count}",
              String(displayCourseData.length),
            )}
            {"・"}
            {dict.timetable.credit_count.replace(
              "{count}",
              String(totalCredits),
            )}
          </span>
        )}
      </div>
      <div
        className={
          !vertical
            ? "grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col divide-y divide-border"
        }
      >
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
            {displayCourseData.map((course) => (
              <TimetableCourseListItem
                key={course.raw_id}
                course={course as MinimalCourse}
                conflictNames={conflictNamesById.get(course.raw_id) ?? []}
                isDuplicate={duplicates.includes(course.raw_id)}
                priority={peAndGeAllocation.indexOf(course.raw_id) + 1}
                displaySettings={displaySettings}
              />
            ))}
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
          <div className="flex flex-col items-center space-y-4">
            <span className="text-lg font-medium text-muted-foreground">
              {dict.timetable.no_courses}
            </span>
            <div className="flex flex-row gap-2">
              <Button
                variant="ghost"
                className="bg-surface hover:bg-muted"
                onClick={() => navigate(`/${language}/courses`)}
              >
                <Search className="w-4 h-4" /> {dict.timetable.all_courses}
              </Button>
            </div>
          </div>
        )}
      </div>
      {afterList}
      <div className="flex items-center gap-1 border-t pt-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={TIMETABLE_ICON_BUTTON}
              aria-label={dict.timetable.display_settings}
              title={dict.timetable.display_settings}
            >
              <Settings />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
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
                variant="ghost"
                size="sm"
                className="bg-surface hover:bg-muted"
                onClick={() => setDisplaySettings(defaultSettings)}
              >
                {dict.timetable.reset_default}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {toolbar}
      </div>
    </div>
  );
};
export default TimetableCourseList;
