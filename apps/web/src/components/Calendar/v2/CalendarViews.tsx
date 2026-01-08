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
}

export function WeekView({
  weekStart,
  events,
  weekStartsOn = 0,
  onEventClick,
  getCalendarColor,
  showTimeGrid = true,
  hourRange = [0, 24],
}: WeekViewProps) {
  const daysOfWeek = getDatesInWeek(weekStart, "UTC", weekStartsOn);
  const [startHour, endHour] = hourRange;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
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

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  return (
    <div className="flex h-full flex-col" data-testid="week-view">
      {/* Week header with dates */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
        {/* Time column header */}
        <div className="border-r border-gray-200 p-2"></div>

        {/* Day headers */}
        {daysOfWeek.map((day) => (
          <div
            key={day.toDateString()}
            className={cn(
              "border-r border-gray-200 p-2 text-center",
              isToday(day) && "bg-blue-50",
            )}
            data-testid={`week-view-header-${format(day, "yyyy-MM-dd")}`}
          >
            <div className="text-xs font-medium text-gray-600">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-blue-600" : "text-gray-900",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Week grid with time slots */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {showTimeGrid && (
            <div className="grid grid-cols-8">
              {hours.map((hour) => (
                <React.Fragment key={hour}>
                  {/* Time label */}
                  <div className="border-b border-r border-gray-200 p-1 text-right text-xs text-gray-500">
                    {format(new Date().setHours(hour, 0, 0, 0), "ha")}
                  </div>

                  {/* Day cells with events */}
                  {daysOfWeek.map((day) => {
                    const dayKey = day.toDateString();
                    const timedEvents =
                      eventsByDay[dayKey]?.filter((e) => !e.isAllDay) || [];
                    const hourEvents = timedEvents.filter((event) => {
                      const eventHour = new Date(event.startTime).getHours();
                      return eventHour === hour;
                    });

                    return (
                      <div
                        key={`${day.toDateString()}-${hour}`}
                        className="min-h-[60px] border-b border-r border-gray-100 p-1"
                        data-testid={`week-view-cell-${format(day, "yyyy-MM-dd")}-${hour}`}
                      >
                        {hourEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            mode="compact"
                            showTime={true}
                            onClick={onEventClick}
                            calendarColor={getCalendarColor?.(event.calendarId)}
                            className="mb-1"
                          />
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* All-day events section */}
          <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
            <div className="border-r border-gray-200 p-2 text-xs text-gray-600">
              All-day
            </div>
            {daysOfWeek.map((day) => {
              const dayKey = day.toDateString();
              const allDayEvents =
                eventsByDay[dayKey]?.filter((e) => e.isAllDay) || [];

              return (
                <div
                  key={dayKey}
                  className="space-y-1 border-r border-gray-200 p-1"
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
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {orderedWeekDays.map((day) => (
          <div
            key={day}
            className="border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-700 last:border-r-0"
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
                "min-h-[100px] border-b border-r border-gray-200 p-1 last:border-r-0",
                !isCurrentMonth(date) && "bg-gray-50",
                isToday(date) && "bg-blue-50",
              )}
              onClick={() => onDateClick?.(date)}
              role={onDateClick ? "button" : undefined}
              data-testid={`month-view-day-${format(date, "yyyy-MM-dd")}`}
            >
              {/* Date number */}
              <div
                className={cn(
                  "mb-1 text-sm font-medium",
                  !isCurrentMonth(date) && "text-gray-400",
                  isCurrentMonth(date) && !isToday(date) && "text-gray-900",
                  isToday(date) &&
                    "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white",
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
                    onClick={(e) => {
                      e.stopPropagation?.();
                      onEventClick?.(event);
                    }}
                    calendarColor={getCalendarColor?.(event.calendarId)}
                    className="text-xs"
                  />
                ))}

                {/* More events indicator */}
                {hiddenCount > 0 && (
                  <div className="text-xs text-gray-600">
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
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="text-lg font-semibold text-gray-900">
          {format(date, "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div
          className="border-b border-gray-200 bg-gray-50 p-2"
          data-testid="day-view-allday"
        >
          <div className="mb-1 text-xs font-medium text-gray-600">
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
              className="flex min-h-[60px] border-b border-gray-200"
              data-testid={`day-view-hour-${hour}`}
            >
              {/* Time label */}
              <div className="w-16 border-r border-gray-200 p-2 text-right text-xs text-gray-500">
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
