"use client";
import {
  Search,
  Trash,
  AlertTriangle,
  Copy,
  GripVertical,
  Loader2,
  Settings,
} from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useRouter } from "next/navigation";
import useDictionary from "@/dictionaries/useDictionary";
import { useMemo } from "react";
import useSyncedStorage from "@/hooks/useSyncedStorage";
import {
  hasConflictingTimeslots,
  hasSameCourse,
  hasTimes,
} from "@/helpers/courses";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import dynamic from "next/dynamic";
import { Button } from "@courseweb/ui";
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
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import Compact from "@uiw/react-color-compact";
import { Separator } from "@courseweb/ui";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@courseweb/ui";
import { TimetableItemDrawer } from "./TimetableItemDrawer";
import { Switch } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";

export const DownloadTimetableDialogDynamic = dynamic(
  () => import("./DownloadTimetableDialog"),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    ),
  },
);
export const ShareSyncTimetableDialogDynamic = dynamic(
  () => import("./ShareSyncTimetableDialog"),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    ),
  },
);
export const CourseSearchContainerDynamic = dynamic(
  () => import("@/app/[lang]/(mods-pages)/courses/CourseSearchContainer"),
  { ssr: false, loading: () => <Loader2 className="w-4 h-4 animate-spin" /> },
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
}: {
  course: MinimalCourse;
  hasConflict: boolean;
  isDuplicate: boolean;
  priority: number;
  displaySettings: DisplaySettings;
}) => {
  const { language } = useSettings();

  const handleCopyClipboard = (id: RawCourseID) => {
    navigator.clipboard.writeText(id);
  };
  const { deleteCourse, colorMap, setColor, currentColors } =
    useUserTimetable();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: course.raw_id, disabled: displaySettings.lockOrder });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      className="flex flex-row gap-2 items-center max-w-3xl"
      ref={setNodeRef}
      style={style}
    >
      {!displaySettings.lockOrder && (
        <GripVertical
          className="w-4 h-4 text-gray-400"
          {...attributes}
          {...listeners}
        />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <div className="p-1 rounded-md hover:outline outline-1 outline-slate-400 mr-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colorMap[course.raw_id] }}
            ></div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Compact
            color={colorMap[course.raw_id]}
            onChange={(color) => {
              setColor(course.raw_id, color.hex);
            }}
            colors={currentColors}
          />
        </PopoverContent>
      </Popover>
      <TimetableItemDrawer course={course}>
        <div className="flex flex-col flex-1">
          {displaySettings.showCourseCode && (
            <div className="text-xs text-muted-foreground">
              {course.department} {course.course}
            </div>
          )}
          {displaySettings.englishNames !== "replace" && (
            <div className="">
              {course.name_zh}{" "}
              <span className="text-muted-foreground">
                {course.teacher_zh.join(",")}
              </span>
            </div>
          )}
          {displaySettings.englishNames === "replace" && (
            <>
              <div className="font-medium text-sm">{course.name_en}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {course.teacher_en.join(",")}
              </div>
            </>
          )}
          {displaySettings.englishNames === "add" && (
            <div className={"text-xs"}>
              {course.name_en} - {course.teacher_en.join(",")}
            </div>
          )}
          <div className="mt-1 flex flex-row gap-1 text-muted-foreground flex-wrap">
            {displaySettings.showVenue &&
              course.venues?.map((venue, index) => {
                const time = course.times![index];
                return (
                  <div
                    key={index}
                    className="px-2 py-0.5 bg-foreground/10 mr-1 rounded-md text-xs whitespace-nowrap"
                  >
                    {venue}{" "}
                    {hasTimes(course as MinimalCourse) ? time : "缺時間"}
                  </div>
                );
              })}
            {displaySettings.showCredits && (
              <div className="px-2 py-0.5 bg-foreground/10 mr-1 rounded-md text-xs whitespace-nowrap">
                {course.credits} 學分
              </div>
            )}
            {displaySettings.showPriority && priority != 0 && (
              <span className="px-2 py-0.5 bg-foreground text-muted mr-1 rounded-md text-xs whitespace-nowrap">
                {priority} 志願
              </span>
            )}
          </div>
        </div>
      </TimetableItemDrawer>
      <div className="flex flex-row space-x-2 items-center">
        {hasConflict && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </HoverCardTrigger>
            <HoverCardContent>
              <span>衝堂</span>
            </HoverCardContent>
          </HoverCard>
        )}
        {isDuplicate && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Copy className="w-6 h-6 text-yellow-500" />
            </HoverCardTrigger>
            <HoverCardContent>
              <span>重複</span>
            </HoverCardContent>
          </HoverCard>
        )}
        <div className="flex flex-row">
          <Button
            className="rounded-l-none"
            variant="outline"
            size="icon"
            onClick={() => deleteCourse(course.raw_id)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>
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
  const router = useRouter();

  const { getSemesterCourses, courses, addCourse, colorMap, setCourses } =
    useUserTimetable();

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
      const courseCopy = [...courses[semester]];
      const oldIndex = courseCopy.indexOf(active.id as string);
      const newIndex = courseCopy.indexOf(over.id as string);
      const newCourseCopy = arrayMove(courseCopy, oldIndex, newIndex);
      setCourses({ ...courses, [semester]: newCourseCopy });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`${
          !vertical
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 "
            : "flex flex-col"
        } gap-4 flex-wrap`}
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
                hasConflict={
                  !!timeConflicts.find(
                    (ts) => ts.course.raw_id == course.raw_id,
                  )
                }
                isDuplicate={duplicates.includes(course.raw_id)}
                priority={peAndGeAllocation.indexOf(course.raw_id) + 1}
                displaySettings={displaySettings}
              />
            ))}
          </SortableContext>
        </DndContext>
        {displayCourseData.length == 0 && (
          <div className="flex flex-col items-center space-y-4">
            <span className="text-lg font-semibold text-gray-400">
              {dict.timetable.no_courses}
            </span>
            <div className="flex flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${language}/courses`)}
              >
                <Search className="w-4 h-4" /> {dict.timetable.all_courses}
              </Button>
            </div>
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
                    <SelectValue placeholder="Select" />
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
            <span className="text-gray-600">{dict.timetable.course}</span>
          </div>
          <div className="space-x-2">
            <span className="font-bold">{totalCredits}</span>
            <span className="text-gray-600">{dict.timetable.credits}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TimetableCourseList;
