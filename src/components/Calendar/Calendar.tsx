import {
  ChevronLeft,
  ChevronRight,
  FolderSync,
  Plus,
  Settings,
} from "lucide-react";
import { addMonths, addWeeks, getMonth, subMonths, subWeeks } from "date-fns";
import { FC, KeyboardEvent, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { CalendarEvent } from "./calendar.types";
import { UpdateType, useCalendar } from "./calendar_hook";
import { AddEventButton } from "./AddEventButton";
import { getWeek } from "./calendar_utils";
import { getMonthForDisplay } from "@/components/Calendar/calendar_utils";
import { CalendarDateSelector } from "@/components/Calendar/CalendarDateSelector";
import { CalendarWeekContainer } from "./CalendarWeekContainer";
import { CalendarMonthContainer } from "./CalendarMonthContainer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { timetableToCalendarEvent } from "./timetableToCalendarEvent";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { CourseTimeslotData } from "@/types/timetable";
import {
  ErrorBoundary,
  ErrorComponent,
} from "next/dist/client/components/error-boundary";
import { useSettings } from "@/hooks/contexts/settings";
import { useSwipeable } from "react-swipeable";
import { semesterInfo } from "@/const/semester";
import { useRxCollection } from "rxdb-hooks";
import { TimetableSyncDocType } from "@/config/rxdb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { toPrettySemester } from "@/helpers/semester";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CalendarError: ErrorComponent = ({ error, reset }) => {
  return <div className="text-red-500">An error occurred: {error.message}</div>;
};

type TimetableSyncRequest = {
  semester: string;
  courses: CourseTimeslotData[];
  reason: "modified" | "new";
};

const CalendarTimetableSyncDialog: FC<{
  request: TimetableSyncRequest;
  onSyncAccept: (request?: TimetableSyncRequest) => void;
}> = ({ request, onSyncAccept }) => {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
  }, [request]);

  const handleUserClose = () => {
    setOpen(false);
    onSyncAccept();
  };

  const handleUserSync = () => {
    setOpen(false);
    onSyncAccept(request);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleUserClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Timetable Update Found!</AlertDialogTitle>
          <AlertDialogDescription>
            {request.reason == "new" ? "New" : "Modified"} courses found in{" "}
            {toPrettySemester(request.semester)}'s Timetable. Do you want to
            sync the changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUserSync}>Sync</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Calendar = () => {
  const [displayDates, setDisplayDates] = useState<Date[]>(getWeek(new Date()));
  const [displayMode, setDisplayMode] = useState<"week" | "month">("week");
  const { events, addEvent, removeEvent, displayContainer, HOUR_HEIGHT } =
    useCalendar();
  const { courses, colorMap, getSemesterCourses } = useUserTimetable();
  const { language } = useSettings();

  //week movers
  const moveBackward = () => {
    switch (displayMode) {
      case "week":
        setDisplayDates(displayDates.map((d) => subWeeks(d, 1)));
        break;
      case "month":
        // get month of current center date
        const month = displayDates[Math.floor(displayDates.length / 2)];
        // subtract 1 month from the month
        setDisplayDates(getMonthForDisplay(subMonths(month, 1)));
        break;
    }
  };

  const moveForward = () => {
    switch (displayMode) {
      case "week":
        setDisplayDates(displayDates.map((d) => addWeeks(d, 1)));
        break;
      case "month":
        // get month of current center date
        const month = displayDates[Math.floor(displayDates.length / 2)];
        // add 1 month from the month
        setDisplayDates(getMonthForDisplay(addMonths(month, 1)));
        break;
    }
  };

  const backToToday = () => {
    switch (displayMode) {
      case "week":
        setDisplayDates(getWeek(new Date()));
        break;
      case "month":
        setDisplayDates(getMonthForDisplay(new Date()));
        break;
    }
  };

  const setDate = (date: Date) => {
    switch (displayMode) {
      case "week":
        setDisplayDates(getWeek(date));
        break;
      case "month":
        setDisplayDates(getMonthForDisplay(date));
        break;
    }
  };

  const handleSwitchMode = (mode: "week" | "month") => {
    setDisplayMode(mode);
    switch (mode) {
      case "week":
        setDisplayDates(getWeek(displayDates[0]));
        break;
      case "month":
        setDisplayDates(getMonthForDisplay(displayDates[0]));
        break;
    }
  };

  const handleAddEvent = (data: CalendarEvent) => {
    addEvent(data);
  };

  const handleOnViewChange = (view: "week" | "month", date: Date) => {
    setDate(date);
    handleSwitchMode(view);
  };

  //listen to keypress events
  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") {
      displayContainer.current?.scrollBy(0, -HOUR_HEIGHT);
    } else if (e.key === "ArrowDown") {
      displayContainer.current?.scrollBy(0, HOUR_HEIGHT);
    } else if (e.key === "ArrowLeft") {
      moveBackward();
    } else if (e.key === "ArrowRight") {
      moveForward();
    } else if (e.key === "t") {
      backToToday();
    } else if (e.key === "w") {
      handleSwitchMode("week");
    } else if (e.key === "m") {
      handleSwitchMode("month");
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      moveForward();
    },
    onSwipedRight: (eventData) => {
      moveBackward();
    },
  });

  const timetableSync = useRxCollection<TimetableSyncDocType>("timetablesync");

  const [availableSync, setAvailableSync] = useState<TimetableSyncRequest[]>(
    [],
  );

  const syncTimetable = async () => {
    if (!timetableSync) return;
    // for each semester, check if its already synced
    const timetableCourses: TimetableSyncRequest[] = [];
    for (const sem in courses) {
      const coursesData = getSemesterCourses(sem);
      // get current synced from db
      const syncData = await timetableSync
        .findOne({ selector: { semester: { $eq: sem } } })
        .exec();
      if (!syncData) {
        timetableCourses.push({
          semester: sem,
          courses: createTimetableFromCourses(
            coursesData as MinimalCourse[],
            colorMap,
          ),
          reason: "new",
        });
        continue;
      }
      // check if courses are modified
      const syncedCourses = syncData.courses as string[];
      // compare courses after converting to timetable format, because some courses might not be displayable.
      const newCourses = createTimetableFromCourses(
        coursesData as MinimalCourse[],
        colorMap,
      );
      const newCoursesId = newCourses.map((c) => c.course.raw_id);
      const coursesModified =
        syncedCourses.filter((c) => !newCoursesId.includes(c)).length > 0 ||
        newCoursesId.filter((c) => !syncedCourses.includes(c)).length > 0;
      if (coursesModified) {
        timetableCourses.push({
          semester: sem,
          courses: newCourses,
          reason: "modified",
        });
      }
    }
    // prompt update if required
    if (timetableCourses.length == 0) return;
    setAvailableSync(timetableCourses);
  };

  useEffect(() => {
    syncTimetable();
  }, [courses, timetableSync]);

  const handleSyncAccept = async (request?: TimetableSyncRequest) => {
    if (request) {
      const courses = timetableToCalendarEvent(request.courses, language);
      courses.forEach((c) => addEvent(c));
      await timetableSync!.upsert({
        semester: request.semester,
        courses: request.courses.map((c) => c.course.raw_id),
        lastSync: new Date().toISOString(),
      });
      setAvailableSync((s) => s.filter((r) => r.semester != request.semester));
    }
  };

  return (
    <ErrorBoundary errorComponent={CalendarError}>
      {availableSync.length > 0 && (
        <CalendarTimetableSyncDialog
          request={availableSync[0]}
          onSyncAccept={handleSyncAccept}
        />
      )}
      <div className="flex flex-col gap-2 md:gap-6 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-2 justify-evenly">
          <div className="flex flex-row justify-between flex-1">
            <div className="flex-1 w-full flex align-middle gap-2">
              <Button variant="outline" onClick={moveBackward} size="icon">
                <ChevronLeft />
              </Button>
              <CalendarDateSelector
                date={displayDates[Math.floor(displayDates.length / 2)]}
                setDate={setDate}
              />
              <Button variant="outline" onClick={moveForward} size="icon">
                <ChevronRight />
              </Button>
            </div>
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild >
              <Button variant="outline">
                <Settings size={16} />
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Clear All</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
          <div className="md:flex flex-row items-center gap-2 hidden ">
            <Select
              value={displayMode}
              onValueChange={(v) => handleSwitchMode(v as "week" | "month")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Display" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={backToToday}>
              Today
            </Button>
            <AddEventButton onEventAdded={handleAddEvent}>
              <Button className="hidden md:inline-flex">
                <Plus className="mr-2" /> 新增行程
              </Button>
            </AddEventButton>
          </div>
        </div>
        <Tabs
          defaultValue={displayMode}
          value={displayMode}
          onValueChange={(v) => handleSwitchMode(v as "week" | "month")}
          className="w-full md:hidden"
        >
          <TabsList className="w-full">
            <TabsTrigger value="week" className="w-full">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="w-full">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full h-[80dvh]" {...handlers}>
          {displayMode == "week" && (
            <CalendarWeekContainer displayWeek={displayDates} />
          )}
          {displayMode == "month" && (
            <CalendarMonthContainer
              displayMonth={displayDates}
              onChangeView={handleOnViewChange}
            />
          )}
        </div>
        <AddEventButton onEventAdded={handleAddEvent}>
          <Button
            className="md:hidden fixed bottom-24 right-8 z-50 rounded-lg shadow-lg"
            size="icon"
          >
            <Plus />
          </Button>
        </AddEventButton>
      </div>
    </ErrorBoundary>
  );
};

export default Calendar;
