/**
 * WeekView Component
 *
 * Displays a week grid with time slots and events positioned by time
 */

import React from "react";
import { format, addDays, isSameDay } from "date-fns";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { EventCard } from "./EventCard";
import {
  getDatesInWeek,
  formatTimeInTimezone,
} from "@/lib/utils/calendar-date-utils";
import { cn } from "@courseweb/ui";

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
  const daysOfWeek = getDatesInWeek(weekStart, "UTC", weekStartsOn);
  const [startHour, endHour] = hourRange;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  // Hour height in pixels for positioning
  const HOUR_HEIGHT = 60;

  // Ref for scroll container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Group events by day
  const eventsByDay = React.useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};

    daysOfWeek.forEach((day) => {
      grouped[day.toDateString()] = [];
    });

    events.forEach((event) => {
      const eventDate = new Date(event.startTime);
      const dateKey = eventDate.toDateString();
      if (grouped[dateKey]) {
        grouped[dateKey].push(event);
      }
    });

    // Sort events by start time within each day
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.startTime - b.startTime);
    });

    return grouped;
  }, [events, daysOfWeek]);

  // Render events in a day with absolute positioning and overlap handling
  const renderEventsInDay = React.useCallback(
    (day: Date) => {
      const dayKey = day.toDateString();
      const timedEvents = eventsByDay[dayKey]?.filter((e) => !e.isAllDay) || [];

      if (timedEvents.length === 0) return null;

      // Group overlapping events
      const groupedEvents: CalendarEvent[][] = [];
      timedEvents.forEach((event) => {
        let added = false;
        for (const group of groupedEvents) {
          if (
            group.some((e) => {
              const eventStart = event.startTime;
              const eventEnd = event.endTime;
              const existingStart = e.startTime;
              const existingEnd = e.endTime;

              return (
                (eventStart >= existingStart && eventStart < existingEnd) ||
                (eventEnd > existingStart && eventEnd <= existingEnd) ||
                (eventStart <= existingStart && eventEnd >= existingEnd)
              );
            })
          ) {
            group.push(event);
            added = true;
            break;
          }
        }
        if (!added) {
          groupedEvents.push([event]);
        }
      });

      return groupedEvents.map((group) =>
        group.map((event, index) => {
          const startDate = new Date(event.startTime);
          const endDate = new Date(event.endTime);

          const topPosition =
            startDate.getHours() * HOUR_HEIGHT +
            (startDate.getMinutes() * HOUR_HEIGHT) / 60;
          const height =
            (endDate.getHours() - startDate.getHours()) * HOUR_HEIGHT +
            ((endDate.getMinutes() - startDate.getMinutes()) * HOUR_HEIGHT) /
              60;

          return (
            <div
              key={event.id}
              className="absolute pr-0.5"
              style={{
                top: `${topPosition}px`,
                height: `${Math.max(height, 20)}px`,
                width: `calc(${100 / group.length}% - 2px)`,
                left: `calc(${(100 / group.length) * index}% + 1px)`,
              }}
              data-event-card="true"
            >
              <EventCard
                event={event}
                mode="compact"
                showTime={true}
                onClick={onEventClick}
                calendarColor={getCalendarColor?.(event.calendarId)}
                className="h-full"
              />
            </div>
          );
        }),
      );
    },
    [eventsByDay, HOUR_HEIGHT, onEventClick, getCalendarColor],
  );

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  return (
    <div className="flex h-full flex-col" data-testid="week-view">
      {/* Week header with dates */}
      <div className="grid grid-cols-8 border-b bg-muted sticky top-0 z-10">
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

      {/* All-day events section */}
      <div className="grid grid-cols-8 border-b bg-muted/50">
        <div className="border-r p-2 text-xs text-muted-foreground">
          All-day
        </div>
        {daysOfWeek.map((day) => {
          const dayKey = day.toDateString();
          const allDayEvents =
            eventsByDay[dayKey]?.filter((e) => e.isAllDay) || [];

          return (
            <div
              key={dayKey}
              className="space-y-1 border-r p-1 last:border-r-0"
              data-testid={`week-view-allday-${format(day, "yyyy-MM-dd")}`}
            >
              {allDayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  mode="compact"
                  showTime={false}
                  onClick={onEventClick}
                  calendarColor={getCalendarColor?.(event.calendarId)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Week grid with time slots */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time labels column */}
        <div className="flex flex-col border-r bg-muted/20">
          {hours.slice(1).map((hour) => (
            <div
              key={hour}
              className="text-right text-xs text-muted-foreground pr-2"
              style={{ height: HOUR_HEIGHT, paddingTop: HOUR_HEIGHT - 16 }}
            >
              {format(new Date().setHours(hour, 0, 0, 0), "ha")}
            </div>
          ))}
        </div>

        {/* Time grid with events */}
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div className="flex relative">
            {daysOfWeek.map((day) => (
              <div
                key={day.toDateString()}
                className="flex-1 relative border-r last:border-r-0"
                onClick={(e) => handleTimeSlotClick(day, e.clientY, e)}
              >
                {/* Hour grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b"
                      style={{ height: HOUR_HEIGHT }}
                    />
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

export function MonthView({
  currentMonth,
  events,
  weekStartsOn = 0,
  onEventClick,
  onDateClick,
  getCalendarColor,
  maxEventsPerDay = 3,
}: MonthViewProps) {
  const gridDates = getMonthGridDates(currentMonth, "UTC", weekStartsOn);

  // Group events by day
  const eventsByDay = React.useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      const eventDate = new Date(event.startTime);
      const dateKey = eventDate.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort events by start time within each day
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.startTime - b.startTime);
    });

    return grouped;
  }, [events]);

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedWeekDays =
    weekStartsOn === 1 ? [...weekDays.slice(1), weekDays[0]] : weekDays;

  return (
    <div className="flex h-full flex-col" data-testid="month-view">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border bg-muted">
        {orderedWeekDays.map((day) => (
          <div
            key={day}
            className="border-r border p-2 text-center text-sm font-medium text-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {gridDates.map((date) => {
          const dateKey = date.toDateString();
          const dayEvents = eventsByDay[dateKey] || [];
          const visibleEvents = dayEvents.slice(0, maxEventsPerDay);
          const hiddenCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[100px] border-b border-r border p-1 last:border-r-0",
                !isCurrentMonth(date) && "bg-muted",
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
                  !isCurrentMonth(date) && "text-muted-foreground/50",
                  isCurrentMonth(date) && !isToday(date) && "text-foreground",
                  isToday(date) &&
                    "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white",
                )}
              >
                {format(date, "d")}
              </div>

              {/* Events */}
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

                {/* More events indicator */}
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
}

export function DayView({
  date,
  events,
  onEventClick,
  getCalendarColor,
  hourRange = [0, 24],
}: DayViewProps) {
  const [startHour, endHour] = hourRange;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="flex h-full flex-col" data-testid="day-view">
      {/* Date header */}
      <div className="border-b border bg-muted p-4">
        <div className="text-lg font-semibold text-foreground">
          {format(date, "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div
          className="border-b border bg-muted p-2"
          data-testid="day-view-allday"
        >
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            All-day events
          </div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
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
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex min-h-[60px] border-b border"
              data-testid={`day-view-hour-${hour}`}
            >
              {/* Time label */}
              <div className="w-16 border-r border p-2 text-right text-xs text-muted-foreground">
                {format(new Date().setHours(hour, 0, 0, 0), "ha")}
              </div>

              {/* Event area */}
              <div className="flex-1 p-1">
                {timedEvents
                  .filter((event) => {
                    const eventHour = new Date(event.startTime).getHours();
                    return eventHour === hour;
                  })
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      mode="normal"
                      showTime={true}
                      showDuration={true}
                      onClick={onEventClick}
                      calendarColor={getCalendarColor?.(event.calendarId)}
                      className="mb-1"
                    />
                  ))}
              </div>
            </div>
          ))}
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
