/**
 * WeekView Component
 *
 * Displays a week grid with time slots and events positioned by time
 */

import React from "react";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
  differenceInDays,
} from "date-fns";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { EventCard } from "./EventCard";
import { DraggableEvent } from "./DraggableEvent";
import { DroppableTimeSlot } from "./DroppableTimeSlot";
import {
  getDatesInWeek,
  formatTimeInTimezone,
  getUserTimezone,
} from "@/lib/utils/calendar-date-utils";
import { cn } from "@courseweb/ui";

/** Clipped event with day-local start/end for positioning */
interface ClippedEvent {
  event: CalendarEvent;
  /** Clipped start time (clamped to start of day if event started earlier) */
  clipStart: Date;
  /** Clipped end time (clamped to end of day if event ends later) */
  clipEnd: Date;
}

/**
 * For each day in the range, return events that overlap that day
 * with their times clipped to the day boundaries.
 */
function getClippedEventsForDays(
  events: CalendarEvent[],
  days: Date[],
): Record<string, ClippedEvent[]> {
  const result: Record<string, ClippedEvent[]> = {};

  days.forEach((day) => {
    result[day.toDateString()] = [];
  });

  events.forEach((event) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    days.forEach((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      // Check if event overlaps this day
      if (eventStart < dayEnd && eventEnd > dayStart) {
        result[day.toDateString()].push({
          event,
          clipStart: eventStart < dayStart ? dayStart : eventStart,
          clipEnd: eventEnd > dayEnd ? dayEnd : eventEnd,
        });
      }
    });
  });

  // Sort by clip start within each day
  Object.keys(result).forEach((key) => {
    result[key].sort((a, b) => a.clipStart.getTime() - b.clipStart.getTime());
  });

  return result;
}

/** Spanning event for grid-based all-day rendering */
interface SpanningEvent {
  event: CalendarEvent;
  gridColumnStart: number; // 1-indexed
  span: number; // How many columns to span
  gridRowStart: number; // 1-indexed row
}

/**
 * Calculate spanning events for all-day section using CSS Grid
 * Events span across multiple columns based on their duration
 */
function getSpanningEvents(
  events: CalendarEvent[],
  weekDays: Date[],
): SpanningEvent[] {
  // Filter for all-day and multi-day events
  const allDayEvents = events.filter((e) => {
    if (e.isAllDay) return true;
    // Include multi-day timed events
    const startDate = new Date(e.startTime);
    const endDate = new Date(e.endTime);
    return startDate.toDateString() !== endDate.toDateString();
  });

  // Calculate span and grid position for each event
  const spanningEvents = allDayEvents.map((event) => {
    const eventStart = startOfDay(new Date(event.startTime));
    const eventEnd = endOfDay(new Date(event.endTime));
    const weekStart = weekDays[0];
    const weekEnd = weekDays[weekDays.length - 1];

    // Clip event to week boundaries
    const displayStart = eventStart < weekStart ? weekStart : eventStart;
    const displayEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

    // Calculate grid column start (1-indexed, +1 for time label column)
    const daysFromWeekStart = Math.max(
      0,
      differenceInDays(displayStart, weekStart),
    );
    const gridColumnStart = daysFromWeekStart + 2; // +1 for 1-indexing, +1 for label column

    // Calculate span (how many days)
    const span = Math.min(
      differenceInDays(endOfDay(displayEnd), startOfDay(displayStart)) + 1,
      weekDays.length - daysFromWeekStart,
    );

    return {
      event,
      gridColumnStart,
      span,
      gridRowStart: 1, // Will be calculated below
    };
  });

  // Sort by start date, then by span (longer first)
  spanningEvents.sort((a, b) => {
    const dateA = new Date(a.event.startTime).getTime();
    const dateB = new Date(b.event.startTime).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return b.span - a.span; // Longer events first
  });

  // Assign rows to avoid overlaps
  const rows: number[][] = []; // Track occupied columns in each row

  spanningEvents.forEach((spanEvent) => {
    const eventStart = spanEvent.gridColumnStart;
    const eventEnd = eventStart + spanEvent.span - 1;

    // Find first row where this event fits
    let rowIndex = 0;
    let foundRow = false;

    while (!foundRow) {
      // Initialize row if needed (8 columns + 1 label = 9 total, 1-indexed)
      if (!rows[rowIndex]) {
        rows[rowIndex] = Array(10).fill(0);
      }

      // Check if row has space
      let hasSpace = true;
      for (let col = eventStart; col <= eventEnd; col++) {
        if (rows[rowIndex][col]) {
          hasSpace = false;
          break;
        }
      }

      if (hasSpace) {
        // Mark columns as occupied
        for (let col = eventStart; col <= eventEnd; col++) {
          rows[rowIndex][col] = 1;
        }
        spanEvent.gridRowStart = rowIndex + 1; // 1-indexed
        foundRow = true;
      } else {
        rowIndex++;
      }
    }
  });

  return spanningEvents;
}

export interface WeekViewProps {
  /**
   * Start date of the week
   */
  weekStart: Date;
  /**
   * Events to display
   */
  events: CalendarEvent[];
  /**
   * Week starts on (0 = Sunday, 1 = Monday)
   */
  weekStartsOn?: 0 | 1;
  /**
   * Event click handler
   */
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Get calendar color for event
   */
  getCalendarColor?: (calendarId: string) => string;
  /**
   * Show time grid
   */
  showTimeGrid?: boolean;
  /**
   * Hour range to display [start, end]
   */
  hourRange?: [number, number];
  /**
   * Time slot click handler
   */
  onTimeSlotClick?: (date: Date, time: Date) => void;
}

export function WeekView({
  weekStart,
  events,
  weekStartsOn = 0,
  onEventClick,
  getCalendarColor,
  showTimeGrid = true,
  hourRange = [0, 24],
  onTimeSlotClick,
}: WeekViewProps) {
  const daysOfWeek = getDatesInWeek(weekStart, getUserTimezone(), weekStartsOn);
  const [startHour, endHour] = hourRange;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  // Hour height in pixels for positioning
  const HOUR_HEIGHT = 60;
  const MIN_EVENT_HEIGHT = 20;

  // Refs for scroll syncing
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const timeLabelContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync time label scroll with main container
  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (timeLabelContainerRef.current) {
      timeLabelContainerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Handle time slot click to create event at clicked time
  const handleTimeSlotClick = React.useCallback(
    (day: Date, clientY: number, e: React.MouseEvent) => {
      // Don't open form if clicked on an existing event
      if ((e.target as HTMLElement).closest("[data-event-card]")) {
        return;
      }

      if (!onTimeSlotClick) return;

      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      const offsetY = clientY - containerRect.top + scrollTop;

      // Convert Y position to hours and minutes
      const totalMinutes = (offsetY / HOUR_HEIGHT) * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);

      // Round to nearest 10 minutes
      const roundedMinutes = Math.round(minutes / 10) * 10;

      // Create time with day and calculated time
      const clickedTime = new Date(day);
      clickedTime.setHours(hours, roundedMinutes, 0, 0);

      onTimeSlotClick(day, clickedTime);
    },
    [onTimeSlotClick, HOUR_HEIGHT],
  );

  // Group events by day with clipping for cross-day events
  const clippedEventsByDay = React.useMemo(
    () => getClippedEventsForDays(events, daysOfWeek),
    [events, daysOfWeek],
  );

  // Calculate spanning events for all-day section
  const spanningEvents = React.useMemo(
    () => getSpanningEvents(events, daysOfWeek),
    [events, daysOfWeek],
  );

  // Render events in a day with absolute positioning and overlap handling
  const renderEventsInDay = React.useCallback(
    (day: Date) => {
      const dayKey = day.toDateString();
      // Filter for single-day timed events only (multi-day timed events go in all-day section)
      const timedEntries =
        clippedEventsByDay[dayKey]?.filter((e) => {
          if (e.event.isAllDay) return false;
          // Check if event spans multiple days
          const startDate = new Date(e.event.startTime);
          const endDate = new Date(e.event.endTime);
          const isSingleDay =
            startDate.toDateString() === endDate.toDateString();
          return isSingleDay;
        }) || [];

      if (timedEntries.length === 0) return null;

      // Group overlapping events (using clipped times for overlap detection)
      const groupedEntries: ClippedEvent[][] = [];
      timedEntries.forEach((entry) => {
        let added = false;
        for (const group of groupedEntries) {
          if (
            group.some((e) => {
              return entry.clipStart < e.clipEnd && entry.clipEnd > e.clipStart;
            })
          ) {
            group.push(entry);
            added = true;
            break;
          }
        }
        if (!added) {
          groupedEntries.push([entry]);
        }
      });

      return groupedEntries.map((group) =>
        group.map((entry, index) => {
          const { event, clipStart, clipEnd } = entry;

          // Position event based on exact start time (hours + minutes)
          const topPosition =
            clipStart.getHours() * HOUR_HEIGHT +
            (clipStart.getMinutes() * HOUR_HEIGHT) / 60;

          // Calculate exact height based on duration using timestamp difference
          // This handles cross-day events correctly (e.g., 11pm to 1am)
          const durationMs = clipEnd.getTime() - clipStart.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          const height = durationHours * HOUR_HEIGHT;

          return (
            <div
              key={`${event.id}-${dayKey}`}
              className="absolute pr-0.5 pointer-events-auto"
              style={{
                top: `${topPosition}px`,
                height: `${Math.max(height, MIN_EVENT_HEIGHT)}px`,
                width: `calc(${100 / group.length}% - 2px)`,
                left: `calc(${(100 / group.length) * index}% + 1px)`,
              }}
              data-event-card="true"
            >
              <DraggableEvent
                event={event}
                mode="compact"
                variant="timed"
                showTime={true}
                onClick={onEventClick}
                calendarColor={
                  getCalendarColor?.(event.calendarId) || "#3b82f6"
                }
                className="h-full"
              />
            </div>
          );
        }),
      );
    },
    [clippedEventsByDay, HOUR_HEIGHT, onEventClick, getCalendarColor],
  );

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  return (
    <div className="flex h-full flex-col" data-testid="week-view">
      {/* Week header with dates */}
      <div
        className="grid border-b bg-muted sticky top-0 z-10"
        style={{
          gridTemplateColumns: `auto repeat(${daysOfWeek.length}, 1fr)`,
        }}
      >
        {/* Time column header */}
        <div className="border-r p-2"></div>

        {/* Day headers */}
        {daysOfWeek.map((day) => (
          <div
            key={day.toDateString()}
            className={cn(
              "border-r p-2 text-center last:border-r-0",
              isToday(day) && "bg-primary/10",
            )}
            data-testid={`week-view-header-${format(day, "yyyy-MM-dd")}`}
          >
            <div className="text-xs font-medium text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-primary" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events section - using CSS Grid for spanning */}
      <div
        className="grid border-b bg-muted/30 gap-y-1 py-1.5 auto-rows-min"
        style={{
          gridTemplateColumns: `auto repeat(${daysOfWeek.length}, 1fr)`,
        }}
      >
        {/* Label column */}
        <div className="border-r px-2 text-xs font-medium text-muted-foreground self-start">
          All-day
        </div>

        {/* Spanning events */}
        {spanningEvents.map(
          ({ event, gridColumnStart, span, gridRowStart }) => (
            <div
              key={event.id}
              className="px-1"
              style={{
                gridColumn: `${gridColumnStart} / span ${span}`,
                gridRow: gridRowStart,
              }}
            >
              <EventCard
                event={event}
                mode="compact"
                variant="solid"
                showTime={!event.isAllDay}
                onClick={onEventClick}
                calendarColor={
                  getCalendarColor?.(event.calendarId) || "#3b82f6"
                }
              />
            </div>
          ),
        )}
      </div>

      {/* Week grid with time slots */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time labels column */}
        <div
          ref={timeLabelContainerRef}
          className="flex flex-col border-r bg-muted/20 overflow-y-hidden"
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-right text-xs text-muted-foreground pr-2"
              style={{ height: HOUR_HEIGHT, paddingTop: HOUR_HEIGHT - 16 }}
            >
              {format(new Date(2000, 0, 1, hour, 0, 0, 0), "ha")}
            </div>
          ))}
        </div>

        {/* Time grid with events */}
        <div
          className="flex-1 overflow-y-auto"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className="flex relative">
            {daysOfWeek.map((day) => (
              <div
                key={day.toDateString()}
                className="flex-1 relative border-r last:border-r-0"
              >
                {/* Hour grid lines with droppable slots */}
                <div
                  className="absolute inset-0"
                  onClick={(e) => handleTimeSlotClick(day, e.clientY, e)}
                >
                  {hours.map((hour) => (
                    <DroppableTimeSlot
                      key={hour}
                      date={day}
                      time={`${String(hour).padStart(2, "0")}:00`}
                      className="border-b pointer-events-none"
                    >
                      <div style={{ height: HOUR_HEIGHT }} />
                    </DroppableTimeSlot>
                  ))}
                </div>

                {/* Events positioned absolutely */}
                {renderEventsInDay(day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MonthView Component
 *
 * Displays a month grid with events
 */

import { getMonthGridDates } from "@/lib/utils/calendar-date-utils";

export interface MonthViewProps {
  /**
   * Current month to display
   */
  currentMonth: Date;
  /**
   * Events to display
   */
  events: CalendarEvent[];
  /**
   * Week starts on (0 = Sunday, 1 = Monday)
   */
  weekStartsOn?: 0 | 1;
  /**
   * Event click handler
   */
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Date click handler
   */
  onDateClick?: (date: Date) => void;
  /**
   * Get calendar color for event
   */
  getCalendarColor?: (calendarId: string) => string;
  /**
   * Maximum events to show per day
   */
  maxEventsPerDay?: number;
}

/** Check if an event spans more than one calendar day */
function isMultiDayEvent(event: CalendarEvent): boolean {
  if (event.isAllDay) return true;
  const start = startOfDay(new Date(event.startTime));
  const end = startOfDay(new Date(event.endTime));
  return start.getTime() !== end.getTime();
}

/** Layout info for a spanning event within a week row */
interface SpanningEvent {
  event: CalendarEvent;
  /** Column index where the event starts (0-6) */
  startCol: number;
  /** Number of columns the event spans */
  span: number;
  /** Lane index for vertical stacking */
  lane: number;
}

/**
 * For a given week row (7 dates), compute spanning event layout.
 * Returns spanning events with lane assignments and column positions.
 */
function computeSpanningLayout(
  weekDates: Date[],
  multiDayEvents: CalendarEvent[],
): SpanningEvent[] {
  const weekStart = startOfDay(weekDates[0]).getTime();
  const weekEnd = endOfDay(weekDates[6]).getTime();

  // Filter events that overlap this week
  const overlapping = multiDayEvents.filter((event) => {
    return event.startTime < weekEnd && event.endTime > weekStart;
  });

  // Sort by start time, then by duration (longer first for better packing)
  overlapping.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    return b.endTime - b.startTime - (a.endTime - a.startTime);
  });

  const result: SpanningEvent[] = [];
  // lanes[lane] = array of column ranges [startCol, endCol] occupied
  const lanes: Array<Array<[number, number]>> = [];

  overlapping.forEach((event) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Calculate start column (clamp to week start)
    let startCol = 0;
    for (let i = 0; i < 7; i++) {
      if (
        startOfDay(weekDates[i]).getTime() <= startOfDay(eventStart).getTime()
      ) {
        startCol = i;
      }
    }
    // If event starts before this week, pin to col 0
    if (eventStart.getTime() < weekStart) startCol = 0;

    // Calculate end column
    let endCol = 6;
    for (let i = 6; i >= 0; i--) {
      if (
        startOfDay(weekDates[i]).getTime() >= startOfDay(eventEnd).getTime()
      ) {
        endCol = i - 1;
      }
    }
    // If event ends after this week, pin to col 6
    if (eventEnd.getTime() > weekEnd) endCol = 6;
    // Ensure at least 1 column span
    if (endCol < startCol) endCol = startCol;

    const span = endCol - startCol + 1;

    // Find the first lane where this event fits
    let assignedLane = -1;
    for (let l = 0; l < lanes.length; l++) {
      const conflicts = lanes[l].some(([s, e]) => startCol <= e && endCol >= s);
      if (!conflicts) {
        assignedLane = l;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push([]);
    }

    lanes[assignedLane].push([startCol, endCol]);
    result.push({ event, startCol, span, lane: assignedLane });
  });

  return result;
}

export function MonthView({
  currentMonth,
  events,
  weekStartsOn = 0,
  onEventClick,
  onDateClick,
  getCalendarColor,
  maxEventsPerDay = 3,
}: MonthViewProps) {
  const gridDates = getMonthGridDates(
    currentMonth,
    getUserTimezone(),
    weekStartsOn,
  );

  // Separate multi-day and single-day events
  const { multiDayEvents, singleDayEventsByDay } = React.useMemo(() => {
    const multiDay: CalendarEvent[] = [];
    const singleDay: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      if (isMultiDayEvent(event)) {
        multiDay.push(event);
      } else {
        const dateKey = new Date(event.startTime).toDateString();
        if (!singleDay[dateKey]) singleDay[dateKey] = [];
        singleDay[dateKey].push(event);
      }
    });

    // Sort single-day events
    Object.keys(singleDay).forEach((key) => {
      singleDay[key].sort((a, b) => a.startTime - b.startTime);
    });

    return { multiDayEvents: multiDay, singleDayEventsByDay: singleDay };
  }, [events]);

  // Split grid into week rows and compute spanning layout for each
  const weekRows = React.useMemo(() => {
    const rows: Array<{
      dates: Date[];
      spanning: SpanningEvent[];
      maxLanes: number;
    }> = [];
    for (let i = 0; i < gridDates.length; i += 7) {
      const weekDates = gridDates.slice(i, i + 7);
      const spanning = computeSpanningLayout(weekDates, multiDayEvents);
      const maxLanes =
        spanning.length > 0 ? Math.max(...spanning.map((s) => s.lane)) + 1 : 0;
      rows.push({ dates: weekDates, spanning, maxLanes });
    }
    return rows;
  }, [gridDates, multiDayEvents]);

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isCurrentMonthDate = (date: Date) =>
    date.getMonth() === currentMonth.getMonth();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedWeekDays =
    weekStartsOn === 1 ? [...weekDays.slice(1), weekDays[0]] : weekDays;

  const SPANNING_EVENT_HEIGHT = 20; // px per spanning event lane
  const MAX_VISIBLE_LANES = 3;

  return (
    <div className="flex h-full flex-col" data-testid="month-view">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b bg-muted">
        {orderedWeekDays.map((day) => (
          <div
            key={day}
            className="border-r p-2 text-center text-sm font-medium text-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid — render week by week */}
      <div className="flex-1 flex flex-col">
        {weekRows.map((weekRow, weekIndex) => {
          const visibleLanes = Math.min(weekRow.maxLanes, MAX_VISIBLE_LANES);
          const spanningAreaHeight = visibleLanes * SPANNING_EVENT_HEIGHT;

          return (
            <div
              key={weekIndex}
              className="flex-1 grid grid-cols-7 relative"
              style={{ minHeight: 100 }}
            >
              {/* Spanning multi-day events overlay */}
              {weekRow.spanning
                .filter((s) => s.lane < MAX_VISIBLE_LANES)
                .map((s) => {
                  const color =
                    getCalendarColor?.(s.event.calendarId) || "#3b82f6";
                  return (
                    <div
                      key={`span-${s.event.id}-${weekIndex}`}
                      className="absolute z-10 rounded-sm px-1 text-xs text-white truncate cursor-pointer hover:opacity-80"
                      style={{
                        top: `${24 + s.lane * SPANNING_EVENT_HEIGHT}px`,
                        left: `${(s.startCol / 7) * 100}%`,
                        width: `${(s.span / 7) * 100}%`,
                        height: `${SPANNING_EVENT_HEIGHT - 2}px`,
                        lineHeight: `${SPANNING_EVENT_HEIGHT - 2}px`,
                        backgroundColor: color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(s.event);
                      }}
                      data-event-card="true"
                      title={s.event.title}
                    >
                      {s.event.title}
                    </div>
                  );
                })}

              {/* Day cells */}
              {weekRow.dates.map((date) => {
                const dateKey = date.toDateString();
                const dayEvents = singleDayEventsByDay[dateKey] || [];
                const maxSingleDay = Math.max(
                  0,
                  maxEventsPerDay - visibleLanes,
                );
                const visibleEvents = dayEvents.slice(0, maxSingleDay);
                const hiddenSpanning = weekRow.spanning.filter(
                  (s) =>
                    s.lane >= MAX_VISIBLE_LANES &&
                    s.startCol <= weekRow.dates.indexOf(date) &&
                    s.startCol + s.span > weekRow.dates.indexOf(date),
                ).length;
                const hiddenCount =
                  dayEvents.length - visibleEvents.length + hiddenSpanning;

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "border-b border-r p-1 last:border-r-0 overflow-hidden",
                      !isCurrentMonthDate(date) && "bg-muted",
                      isToday(date) && "bg-primary/10",
                    )}
                    onClick={() => onDateClick?.(date)}
                    role={onDateClick ? "button" : undefined}
                    data-testid={`month-view-day-${format(date, "yyyy-MM-dd")}`}
                  >
                    {/* Date number */}
                    <div
                      className={cn(
                        "mb-1 text-sm font-medium",
                        !isCurrentMonthDate(date) && "text-muted-foreground/50",
                        isCurrentMonthDate(date) &&
                          !isToday(date) &&
                          "text-foreground",
                        isToday(date) &&
                          "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white",
                      )}
                    >
                      {format(date, "d")}
                    </div>

                    {/* Spacer for spanning events */}
                    {spanningAreaHeight > 0 && (
                      <div style={{ height: spanningAreaHeight }} />
                    )}

                    {/* Single-day timed events */}
                    <div className="space-y-0.5">
                      {visibleEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          mode="compact"
                          showTime={!event.isAllDay}
                          onClick={onEventClick}
                          calendarColor={getCalendarColor?.(event.calendarId)}
                          className="text-xs"
                        />
                      ))}

                      {hiddenCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          +{hiddenCount} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * DayView Component
 *
 * Displays a single day with hourly time slots
 */

export interface DayViewProps {
  /**
   * Date to display
   */
  date: Date;
  /**
   * Events to display
   */
  events: CalendarEvent[];
  /**
   * Event click handler
   */
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Get calendar color for event
   */
  getCalendarColor?: (calendarId: string) => string;
  /**
   * Hour range to display [start, end]
   */
  hourRange?: [number, number];
  /**
   * Time slot click handler
   */
  onTimeSlotClick?: (date: Date, time: Date) => void;
}

export function DayView({
  date,
  events,
  onEventClick,
  getCalendarColor,
  hourRange = [0, 24],
  onTimeSlotClick,
}: DayViewProps) {
  const [startHour, endHour] = hourRange;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  const HOUR_HEIGHT = 60;
  const MIN_EVENT_HEIGHT = 20;
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Get clipped events for this day (handles cross-day events)
  const clippedEvents = React.useMemo(
    () => getClippedEventsForDays(events, [date]),
    [events, date],
  );

  const dayKey = date.toDateString();
  const allDayEntries =
    clippedEvents[dayKey]?.filter((e) => e.event.isAllDay) || [];
  const timedEntries =
    clippedEvents[dayKey]?.filter((e) => !e.event.isAllDay) || [];

  // Handle time slot click to create event at clicked time
  const handleTimeSlotClick = React.useCallback(
    (clientY: number, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-event-card]")) return;
      if (!onTimeSlotClick) return;

      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      const offsetY = clientY - containerRect.top + scrollTop;

      const totalMinutes = (offsetY / HOUR_HEIGHT) * 60;
      const clickedHours = Math.floor(totalMinutes / 60);
      const clickedMinutes =
        Math.round(Math.floor(totalMinutes % 60) / 10) * 10;

      const clickedTime = new Date(date);
      clickedTime.setHours(clickedHours, clickedMinutes, 0, 0);

      onTimeSlotClick(date, clickedTime);
    },
    [onTimeSlotClick, date, HOUR_HEIGHT],
  );

  // Group overlapping events for side-by-side display
  const groupedEntries = React.useMemo(() => {
    const groups: ClippedEvent[][] = [];
    timedEntries.forEach((entry) => {
      let added = false;
      for (const group of groups) {
        if (
          group.some(
            (e) => entry.clipStart < e.clipEnd && entry.clipEnd > e.clipStart,
          )
        ) {
          group.push(entry);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.push([entry]);
      }
    });
    return groups;
  }, [timedEntries]);

  return (
    <div className="flex h-full flex-col" data-testid="day-view">
      {/* Date header */}
      <div className="border-b bg-muted p-4">
        <div className="text-lg font-semibold text-foreground">
          {format(date, "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* All-day events */}
      {allDayEntries.length > 0 && (
        <div className="border-b bg-muted p-2" data-testid="day-view-allday">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            All-day events
          </div>
          <div className="space-y-1">
            {allDayEntries.map(({ event }) => (
              <EventCard
                key={event.id}
                event={event}
                mode="normal"
                showTime={false}
                onClick={onEventClick}
                calendarColor={getCalendarColor?.(event.calendarId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="flex">
          {/* Time labels */}
          <div className="flex flex-col border-r bg-muted/20">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-right text-xs text-muted-foreground pr-2"
                style={{ height: HOUR_HEIGHT, paddingTop: HOUR_HEIGHT - 16 }}
              >
                {format(new Date(2000, 0, 1, hour, 0, 0, 0), "ha")}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div className="flex-1 relative">
            {/* Hour grid lines with droppable slots */}
            <div
              className="absolute inset-0"
              onClick={(e) => handleTimeSlotClick(e.clientY, e)}
            >
              {hours.map((hour) => (
                <DroppableTimeSlot
                  key={hour}
                  date={date}
                  time={`${String(hour).padStart(2, "0")}:00`}
                  className="border-b pointer-events-none"
                >
                  <div style={{ height: HOUR_HEIGHT }} />
                </DroppableTimeSlot>
              ))}
            </div>

            {/* Events positioned absolutely */}
            {groupedEntries.map((group) =>
              group.map((entry, index) => {
                const { event, clipStart, clipEnd } = entry;

                const topPosition =
                  clipStart.getHours() * HOUR_HEIGHT +
                  (clipStart.getMinutes() * HOUR_HEIGHT) / 60;

                const durationMs = clipEnd.getTime() - clipStart.getTime();
                const durationHours = durationMs / (1000 * 60 * 60);
                const height = durationHours * HOUR_HEIGHT;

                return (
                  <div
                    key={`${event.id}-${dayKey}`}
                    className="absolute pr-0.5 pointer-events-auto"
                    style={{
                      top: `${topPosition}px`,
                      height: `${Math.max(height, 20)}px`,
                      width: `calc(${100 / group.length}% - 2px)`,
                      left: `calc(${(100 / group.length) * index}% + 1px)`,
                    }}
                    data-event-card="true"
                  >
                    <DraggableEvent
                      event={event}
                      mode="compact"
                      showTime={true}
                      onClick={onEventClick}
                      calendarColor={
                        getCalendarColor?.(event.calendarId) || "#3b82f6"
                      }
                      className="h-full"
                    />
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AgendaView Component
 *
 * Displays upcoming events in a list format
 */

import { EventList } from "./EventCard";

export interface AgendaViewProps {
  /**
   * Events to display
   */
  events: CalendarEvent[];
  /**
   * Event click handler
   */
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Get calendar color for event
   */
  getCalendarColor?: (calendarId: string) => string;
  /**
   * Show past events
   */
  showPastEvents?: boolean;
}

export function AgendaView({
  events,
  onEventClick,
  getCalendarColor,
  showPastEvents = false,
}: AgendaViewProps) {
  const now = Date.now();

  const filteredEvents = React.useMemo(() => {
    let filtered = events;

    if (!showPastEvents) {
      filtered = filtered.filter((event) => event.endTime >= now);
    }

    return filtered.sort((a, b) => a.startTime - b.startTime);
  }, [events, showPastEvents, now]);

  return (
    <div className="h-full overflow-y-auto p-4" data-testid="agenda-view">
      <EventList
        events={filteredEvents}
        groupByDate={true}
        mode="detailed"
        onEventClick={onEventClick}
        getCalendarColor={getCalendarColor}
        emptyMessage="No upcoming events"
      />
    </div>
  );
}
