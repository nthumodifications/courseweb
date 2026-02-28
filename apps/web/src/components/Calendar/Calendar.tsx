import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns4,
  Grid3x3,
  Plus,
  Rows2,
} from "lucide-react";
import { addMonths, addWeeks, subMonths, subWeeks } from "date-fns";
import { KeyboardEvent, useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";

import { CalendarEvent, TimetableSyncRequest } from "./calendar.types";
import { useCalendar } from "./calendar_hook";
import { AddEventButton } from "./AddEventButton";
import { getWeek } from "./calendar_utils";
import { getMonthForDisplay } from "@/components/Calendar/calendar_utils";
import { CalendarDateSelector } from "@/components/Calendar/CalendarDateSelector";
import { CalendarWeekContainer } from "./CalendarWeekContainer";
import { CalendarMonthContainer } from "./CalendarMonthContainer";
import { Tabs, TabsList, TabsTrigger } from "@courseweb/ui";
import { timetableToCalendarEvent } from "./timetableToCalendarEvent";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { ErrorBoundary } from "react-error-boundary";
import { useSettings } from "@/hooks/contexts/settings";
import { useSwipeable } from "react-swipeable";
import { useRxCollection } from "rxdb-hooks";
import { TimetableSyncDocType } from "@/config/rxdb";
import CalendarTimetableSyncDialog from "./CalendarTimetableSyncDialog";
import { toast } from "@courseweb/ui";
import { toPrettySemester } from "@/helpers/semester";
import { useHeaderPortal } from "@/components/Portal/HeaderPortal";
import UpcomingEvents from "./UpcomingEvents";
import { useIsMobile } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const CalendarError = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  return <div className="text-red-500">An error occurred: {error.message}</div>;
};

const Calendar = () => {
  const [displayDates, setDisplayDates] = useState<Date[]>(getWeek(new Date()));
  const [displayMode, setDisplayMode] = useState<"week" | "month" | "upcoming">(
    "week",
  );
  const { events, addEvent, removeEvent, displayContainer, HOUR_HEIGHT } =
    useCalendar();
  const { courses, colorMap, getSemesterCourses } = useUserTimetable();
  const { language } = useSettings();
  const [dbReady, setDbReady] = useState(false);
  const isMobile = useIsMobile();
  const dict = useDictionary();

  // Get the portal functions
  const { setPortalContent, clearPortalContent } = useHeaderPortal();

  const setDate = useCallback(
    (date: Date) => {
      switch (displayMode) {
        case "week":
          setDisplayDates(getWeek(date));
          break;
        case "month":
          setDisplayDates(getMonthForDisplay(date));
          break;
      }
    },
    [displayMode],
  );

  // When component mounts or displayDates change, update the header content
  useEffect(() => {
    const centerDate = displayDates[Math.floor(displayDates.length / 2)];

    // Create the portal content with tabs included
    const content = (
      <div className="md:w-full flex flex-row items-center justify-between gap-2">
        <div className="flex align-middle gap-2">
          <Button
            variant="ghost"
            onClick={moveBackward}
            size="icon"
            className="hidden md:inline-flex"
          >
            <ChevronLeft />
          </Button>
          <CalendarDateSelector date={centerDate} setDate={setDate} />
          <Button
            variant="ghost"
            onClick={moveForward}
            size="icon"
            className="hidden md:inline-flex"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="flex items-center">
          <Tabs
            defaultValue={displayMode}
            value={displayMode}
            onValueChange={(v) =>
              handleSwitchMode(v as "week" | "month" | "upcoming")
            }
            className="mr-2"
          >
            <TabsList className="h-8">
              <TabsTrigger value="upcoming" className="md:hidden h-7 px-2">
                <Rows2 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="week" className="h-7 px-2">
                <Columns4 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="month" className="h-7 px-2">
                <Grid3x3 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            onClick={backToToday}
            className="h-8 hidden md:inline-flex"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </div>
      </div>
    );

    // Set the portal content
    setPortalContent(content);

    // Clean up when unmounting
    return () => {
      clearPortalContent();
    };
  }, [displayDates, setDate, displayMode]); // Added displayMode as dependency

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

  const handleSwitchMode = (mode: "week" | "month" | "upcoming") => {
    setDisplayMode(mode);
    switch (mode) {
      case "week":
        setDisplayDates(getWeek(displayDates[0]));
        break;
      case "month":
        setDisplayDates(getMonthForDisplay(displayDates[0]));
        break;
      case "upcoming":
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

  // Check if database is ready
  useEffect(() => {
    if (timetableSync) {
      // Wait a bit to ensure DB is fully initialized
      const timer = setTimeout(() => {
        setDbReady(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timetableSync]);

  const syncTimetable = async () => {
    if (!timetableSync || !dbReady || Object.keys(courses).length === 0) return;

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
    if (dbReady) {
      syncTimetable();
    }
  }, [courses, timetableSync, dbReady]);

  const handleSyncAccept = async (
    request: TimetableSyncRequest,
    accept: boolean,
  ) => {
    console.log("Syncing", request.semester, accept);
    const courses = timetableToCalendarEvent(request.courses, language);
    if (accept) {
      courses.forEach((c) => addEvent(c));
    } else {
      toast({
        title: `Semester ${toPrettySemester(request.semester)} sync cancelled`,
        description: "You can sync again if the timetable changes",
      });
    }
    await timetableSync!.upsert({
      semester: request.semester,
      courses: request.courses.map((c) => c.course.raw_id),
      lastSync: new Date().toISOString(),
    });

    setAvailableSync((s) => s.filter((r) => r.semester != request.semester));
  };

  return (
    <ErrorBoundary FallbackComponent={CalendarError}>
      {availableSync.length > 0 && dbReady && (
        <CalendarTimetableSyncDialog
          request={availableSync[0]}
          onSyncAccept={handleSyncAccept}
        />
      )}
      <div className="flex flex-col gap-2 md:gap-6 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-2 justify-end">
          <div className="md:flex flex-row items-center gap-2 hidden ">
            <AddEventButton onEventAdded={handleAddEvent}>
              <Button className="hidden md:inline-flex">
                <Plus className="mr-2" /> {dict.calendar.add_event}
              </Button>
            </AddEventButton>
          </div>
        </div>
        <div className="w-full h-[80dvh]" {...handlers}>
          {displayMode === "week" && (
            <CalendarWeekContainer displayWeek={displayDates} />
          )}
          {displayMode === "month" && (
            <CalendarMonthContainer
              displayMonth={displayDates}
              onChangeView={handleOnViewChange}
            />
          )}
          {displayMode === "upcoming" && (
            <div className="px-2 py-4">
              <UpcomingEvents />
            </div>
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
