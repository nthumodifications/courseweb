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
import type { OverlayEntry } from "./OthersTimetablePanel";
import { CalendarEventInternal } from "./calendar.types";

const CalendarError = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  const dict = useDictionary();

  return (
    <div className="text-destructive">
      {dict.common.error}: {error.message}
    </div>
  );
};

const Calendar = ({ overlays = [] }: { overlays?: OverlayEntry[] }) => {
  const [displayDates, setDisplayDates] = useState<Date[]>(getWeek(new Date()));
  const [displayMode, setDisplayMode] = useState<"week" | "month" | "upcoming">(
    "week",
  );
  const { addEvent, displayContainer, HOUR_HEIGHT, timetableSyncReady } =
    useCalendar();
  const {
    courses,
    colorMap,
    getSemesterCourses,
    isLoading: coursesLoading,
  } = useUserTimetable();
  const { language } = useSettings();
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
            aria-label={dict.calendar.accessibility.previous_period}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <CalendarDateSelector date={centerDate} setDate={setDate} />
          <Button
            variant="ghost"
            onClick={moveForward}
            size="icon"
            className="hidden md:inline-flex"
            aria-label={dict.calendar.accessibility.next_period}
          >
            <ChevronRight aria-hidden="true" />
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
              <TabsTrigger
                value="upcoming"
                className="md:hidden h-7 px-2"
                aria-label={dict.calendar.accessibility.view_upcoming}
              >
                <Rows2 className="h-4 w-4" aria-hidden="true" />
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="h-7 px-2"
                aria-label={dict.calendar.accessibility.view_week}
              >
                <Columns4 className="h-4 w-4" aria-hidden="true" />
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="h-7 px-2"
                aria-label={dict.calendar.accessibility.view_month}
              >
                <Grid3x3 className="h-4 w-4" aria-hidden="true" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            onClick={backToToday}
            className="h-8 hidden md:inline-flex"
            aria-label={dict.calendar.accessibility.today}
          >
            <CalendarIcon className="size-4" aria-hidden="true" />
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
  }, [displayDates, setDate, displayMode, language]); // Added displayMode as dependency

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
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    if (
      target.matches(
        "input, textarea, select, button, a, [contenteditable='true']",
      )
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    if (e.key === "ArrowUp") {
      e.preventDefault();
      displayContainer.current?.scrollBy(0, -HOUR_HEIGHT);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      displayContainer.current?.scrollBy(0, HOUR_HEIGHT);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveBackward();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveForward();
    } else if (key === "t") {
      e.preventDefault();
      backToToday();
    } else if (key === "w") {
      e.preventDefault();
      handleSwitchMode("week");
    } else if (key === "m") {
      e.preventDefault();
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
    if (
      !timetableSync ||
      !timetableSyncReady ||
      coursesLoading ||
      Object.keys(courses).length === 0
    )
      return;

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
    if (timetableSyncReady && !coursesLoading) {
      syncTimetable();
    }
  }, [courses, timetableSync, timetableSyncReady, coursesLoading]);

  const handleSyncAccept = async (
    request: TimetableSyncRequest,
    accept: boolean,
  ) => {
    if (accept) {
      const calendarEvents = timetableToCalendarEvent(
        request.courses,
        language,
      );
      calendarEvents.forEach((c) => addEvent(c));
    } else {
      toast({
        title: dict.calendar.sync.cancelled_title.replace(
          "{semester}",
          toPrettySemester(request.semester),
        ),
        description: dict.calendar.sync.cancelled_description,
      });
    }

    // Always record the known course set (accepted or dismissed) so the dialog
    // is not re-shown for the same courses on subsequent mounts/course-changes.
    await timetableSync!.upsert({
      semester: request.semester,
      courses: request.courses.map((c) => c.course.raw_id),
      lastSync: new Date().toISOString(),
    });

    setAvailableSync((s) => s.filter((r) => r.semester != request.semester));
  };

  return (
    <ErrorBoundary FallbackComponent={CalendarError}>
      {availableSync.length > 0 && timetableSyncReady && (
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
        <AddEventButton onEventAdded={handleAddEvent}>
          <Button
            className="md:hidden fixed bottom-24 right-8 z-50 rounded-lg shadow-lg"
            size="icon"
            aria-label={dict.calendar.add_event}
          >
            <Plus aria-hidden="true" />
          </Button>
        </AddEventButton>
        <div
          className="w-full h-[80dvh]"
          {...handlers}
          data-calendar-root
          role="region"
          tabIndex={0}
          aria-label={dict.calendar.accessibility.calendar}
          aria-describedby="calendar-keyboard-shortcuts"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight T W M"
          onKeyDown={handleKeyPress}
        >
          <span id="calendar-keyboard-shortcuts" className="sr-only">
            {dict.calendar.accessibility.shortcuts}
          </span>
          {displayMode === "week" && (
            <CalendarWeekContainer
              displayWeek={displayDates}
              overlayEvents={overlays.flatMap((o) =>
                timetableToCalendarEvent(o.timetableData, language).map(
                  (e) =>
                    ({
                      ...e,
                      actualEnd: e.repeat ? new Date(e.repeat.value) : e.end,
                      color: o.color,
                    }) as CalendarEventInternal,
                ),
              )}
            />
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
      </div>
    </ErrorBoundary>
  );
};

export default Calendar;
