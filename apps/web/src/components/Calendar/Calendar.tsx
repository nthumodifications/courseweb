import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns4,
  Grid3x3,
  Plus,
  Rows2,
} from "lucide-react";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
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
import {
  addTaipeiDays,
  addTaipeiMonths,
  getTaipeiMonthForDisplay,
  getTaipeiWeek,
} from "@/helpers/dates";
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
import {
  getTimetableSyncSemesters,
  reconcileTimetableEvents,
} from "./timetableReconcile";

type TimetableSyncPrompt = TimetableSyncRequest & {
  deletionCount: number;
};

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
  const [displayDates, setDisplayDates] = useState<Date[]>(
    getTaipeiWeek(new Date()),
  );
  const [displayMode, setDisplayMode] = useState<"week" | "month" | "upcoming">(
    "week",
  );
  const {
    addEvent,
    displayContainer,
    events,
    eventSyncReady,
    HOUR_HEIGHT,
    removeEvents,
    timetableSyncReady,
  } = useCalendar();
  const {
    courses,
    colorMap,
    getSemesterCourses,
    error: coursesError,
    isLoading: coursesLoading,
    timetableDataReady,
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
          setDisplayDates(getTaipeiWeek(date));
          break;
        case "month":
          setDisplayDates(getTaipeiMonthForDisplay(date));
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
        setDisplayDates(
          getTaipeiWeek(
            addTaipeiDays(
              displayDates[Math.floor(displayDates.length / 2)],
              -7,
            ),
          ),
        );
        break;
      case "month":
        // get month of current center date
        const month = displayDates[Math.floor(displayDates.length / 2)];
        // subtract 1 month from the month
        setDisplayDates(getTaipeiMonthForDisplay(addTaipeiMonths(month, -1)));
        break;
    }
  };

  const moveForward = () => {
    switch (displayMode) {
      case "week":
        setDisplayDates(
          getTaipeiWeek(
            addTaipeiDays(displayDates[Math.floor(displayDates.length / 2)], 7),
          ),
        );
        break;
      case "month":
        // get month of current center date
        const month = displayDates[Math.floor(displayDates.length / 2)];
        // add 1 month from the month
        setDisplayDates(getTaipeiMonthForDisplay(addTaipeiMonths(month, 1)));
        break;
    }
  };

  const backToToday = () => {
    switch (displayMode) {
      case "week":
        setDisplayDates(getTaipeiWeek(new Date()));
        break;
      case "month":
        setDisplayDates(getTaipeiMonthForDisplay(new Date()));
        break;
    }
  };

  const handleSwitchMode = (mode: "week" | "month" | "upcoming") => {
    setDisplayMode(mode);
    switch (mode) {
      case "week":
        setDisplayDates(getTaipeiWeek(displayDates[0]));
        break;
      case "month":
        setDisplayDates(getTaipeiMonthForDisplay(displayDates[0]));
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

  const [availableSync, setAvailableSync] = useState<TimetableSyncPrompt[]>([]);
  const applyingSyncRef = useRef(false);

  const getCurrentTimetable = (semester: string) =>
    createTimetableFromCourses(
      getSemesterCourses(semester) as MinimalCourse[],
      colorMap,
    );

  /**
   * useUserTimetable retains cached course data while its current-user query
   * settles. Do not treat a partially materialized semester as an empty one:
   * that would make reconciliation delete another user's generated events.
   */
  const isTimetableDataSettled = () => {
    if (coursesError || !timetableDataReady) return false;
    return Object.entries(courses).every(([semester, courseIds]) => {
      if (!Array.isArray(courseIds)) return false;
      const loadedCourseIds = getSemesterCourses(semester).map(
        (course) => course.raw_id,
      );
      return (
        loadedCourseIds.length === courseIds.length &&
        courseIds.every((courseId) => loadedCourseIds.includes(courseId))
      );
    });
  };

  const persistedEventsForSemester = (semester: string) =>
    events.filter(
      (event) =>
        event.courseId != null && event.courseId.slice(0, 5) === semester,
    );

  const syncTimetable = async () => {
    if (
      !timetableSync ||
      !timetableSyncReady ||
      !eventSyncReady ||
      coursesLoading ||
      !isTimetableDataSettled()
    )
      return;

    const syncDocuments = await timetableSync.find().exec();
    const syncBySemester = new Map(
      syncDocuments.map((document) => [document.semester, document]),
    );
    const timetableCourses: TimetableSyncPrompt[] = [];
    const semesters = getTimetableSyncSemesters(
      Object.keys(courses),
      syncDocuments,
    );

    for (const semester of semesters) {
      const currentCourses = getCurrentTimetable(semester);
      const diff = reconcileTimetableEvents({
        generated: timetableToCalendarEvent(currentCourses, language),
        persisted: persistedEventsForSemester(semester),
        semester,
      });
      const syncData = syncBySemester.get(semester);
      const hasChanges = diff.toUpsert.length > 0 || diff.toDelete.length > 0;

      if (!syncData && currentCourses.length === 0 && !hasChanges) continue;
      if (syncData && !hasChanges) continue;

      timetableCourses.push({
        semester,
        courses: currentCourses,
        reason: syncData ? "modified" : "new",
        deletionCount: diff.toDelete.length,
      });
    }

    setAvailableSync(timetableCourses);
  };

  useEffect(() => {
    if (
      timetableSyncReady &&
      eventSyncReady &&
      !coursesLoading &&
      !coursesError &&
      !applyingSyncRef.current
    ) {
      syncTimetable();
    }
  }, [
    courses,
    coursesError,
    coursesLoading,
    events,
    eventSyncReady,
    timetableSync,
    timetableSyncReady,
  ]);

  const handleSyncAccept = async (
    request: TimetableSyncRequest,
    accept: boolean,
  ) => {
    if (
      !timetableSync ||
      !timetableSyncReady ||
      !eventSyncReady ||
      coursesLoading ||
      !isTimetableDataSettled()
    ) {
      return;
    }

    const currentCourses = getCurrentTimetable(request.semester);
    const currentEvents = timetableToCalendarEvent(currentCourses, language);
    const diff = reconcileTimetableEvents({
      generated: currentEvents,
      persisted: persistedEventsForSemester(request.semester),
      semester: request.semester,
    });

    if (accept) {
      applyingSyncRef.current = true;
      try {
        await removeEvents(diff.toDelete);
        await Promise.all(diff.toUpsert.map((event) => addEvent(event)));
      } catch {
        toast({
          title: dict.common.error,
          description: dict.calendar.sync.failed_description,
        });
        applyingSyncRef.current = false;
        return;
      }
      applyingSyncRef.current = false;
    } else {
      toast({
        title: dict.calendar.sync.cancelled_title.replace(
          "{semester}",
          toPrettySemester(request.semester),
        ),
        description: dict.calendar.sync.cancelled_description,
      });
    }

    // Record the current generated course set only after accepted event writes
    // have completed. The next pass still compares event content, so a
    // dismissed diff remains eligible for a later reconciliation prompt.
    try {
      await timetableSync.upsert({
        semester: request.semester,
        courses: currentCourses.map((c) => c.course.raw_id),
        lastSync: new Date().toISOString(),
      });
    } catch {
      toast({
        title: dict.common.error,
        description: dict.calendar.sync.failed_description,
      });
      return;
    }

    setAvailableSync((s) => s.filter((r) => r.semester != request.semester));
  };

  return (
    <ErrorBoundary FallbackComponent={CalendarError}>
      {availableSync.length > 0 &&
        timetableSyncReady &&
        eventSyncReady &&
        !coursesLoading && (
          <CalendarTimetableSyncDialog
            request={availableSync[0]}
            deletionCount={availableSync[0].deletionCount}
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
