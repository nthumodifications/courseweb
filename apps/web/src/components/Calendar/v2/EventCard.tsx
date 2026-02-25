/**
 * EventCard Component
 *
 * Displays a single calendar event with proper styling and information.
 * Supports different display modes for different calendar views.
 */

import React from "react";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import {
  formatDateTimeInTimezone,
  formatTimeInTimezone,
  getEventDuration,
  formatDuration,
} from "@/lib/utils/calendar-date-utils";
import { cn } from "@courseweb/ui";

export interface EventCardProps {
  event: CalendarEvent;
  /**
   * Display mode affects how the event is rendered
   * - compact: Minimal info, for dense views
   * - normal: Standard display with time and title
   * - detailed: Full information including description
   */
  mode?: "compact" | "normal" | "detailed";
  /**
   * Visual variant affects styling
   * - default: Border-left with card background
   * - solid: Solid color background (for all-day/multi-day events)
   * - timed: Solid background for timed events in week/day view
   */
  variant?: "default" | "solid" | "timed";
  /**
   * Show event time
   */
  showTime?: boolean;
  /**
   * Show event duration
   */
  showDuration?: boolean;
  /**
   * Click handler
   */
  onClick?: (event: CalendarEvent) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Calendar color for event indicator
   */
  calendarColor?: string;
}

export function EventCard({
  event,
  mode = "normal",
  variant = "default",
  showTime = true,
  showDuration = false,
  onClick,
  className,
  calendarColor = "#3b82f6",
}: EventCardProps) {
  const handleClick = () => {
    onClick?.(event);
  };

  const duration = getEventDuration(event.startTime, event.endTime);
  const startDate = new Date(event.startTime);

  // Convert hex color to rgba for background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Determine styling based on variant
  const isSolidVariant = variant === "solid";
  const backgroundColor = isSolidVariant
    ? calendarColor // Solid color for all-day events
    : variant === "timed"
      ? hexToRgba(calendarColor, 0.15) // Light transparent for timed events
      : undefined;
  const textColor = isSolidVariant ? "#ffffff" : undefined;

  return (
    <div
      className={cn(
        "rounded-sm transition-colors overflow-hidden",
        onClick && "cursor-pointer",
        // Default variant styling
        variant === "default" && "border bg-card p-2 hover:bg-muted/50",
        // Solid variant styling (all-day/multi-day events)
        variant === "solid" && "px-2 py-1.5 hover:opacity-90 border-0",
        // Timed variant styling (week/day view timed events) - left border with transparent bg
        variant === "timed" &&
          "px-2 py-1.5 hover:bg-muted/10 border-l-4 border-0",
        className,
      )}
      onClick={handleClick}
      style={{
        ...(variant === "default"
          ? {
              borderLeftColor: calendarColor,
              borderLeftWidth: "3px",
            }
          : variant === "timed"
            ? {
                backgroundColor,
                borderLeftColor: calendarColor,
              }
            : {
                backgroundColor,
                color: textColor,
              }),
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(event);
        }
      }}
      data-testid="event-card"
      data-event-id={event.id}
    >
      {/* Event Title */}
      <div
        className={cn(
          "truncate leading-tight",
          mode === "compact" ? "text-xs font-semibold" : "text-sm font-medium",
          variant === "timed" && "text-xs font-semibold",
          event.isDeleted && "opacity-50 line-through",
        )}
      >
        {event.title}
      </div>

      {/* Event Time and Duration */}
      {showTime && !event.isAllDay && (
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5",
            variant === "default" && "text-muted-foreground",
            isSolidVariant && "opacity-80",
          )}
        >
          <span className="text-xs leading-tight">
            {formatTimeInTimezone(startDate)}
          </span>
          {showDuration && (
            <span className="opacity-75 text-xs">
              ({formatDuration(duration)})
            </span>
          )}
        </div>
      )}

      {/* All-Day Indicator */}
      {event.isAllDay && mode !== "compact" && (
        <div className="mt-1 text-xs text-muted-foreground">All day</div>
      )}

      {/* Location */}
      {event.location && mode !== "compact" && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {/* Description */}
      {event.description && mode === "detailed" && (
        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {event.description}
        </div>
      )}

      {/* Tags */}
      {event.tags && event.tags.length > 0 && mode !== "compact" && (
        <div className="mt-2 flex flex-wrap gap-1">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Recurring Indicator */}
      {event.rrule && mode !== "compact" && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Repeating</span>
        </div>
      )}
    </div>
  );
}

/**
 * EventList Component
 *
 * Displays a list of events with grouping options
 */

export interface EventListProps {
  events: CalendarEvent[];
  /**
   * Group events by date
   */
  groupByDate?: boolean;
  /**
   * Display mode for event cards
   */
  mode?: "compact" | "normal" | "detailed";
  /**
   * Show empty state when no events
   */
  emptyMessage?: string;
  /**
   * Event click handler
   */
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Get calendar color for event
   */
  getCalendarColor?: (calendarId: string) => string;
}

export function EventList({
  events,
  groupByDate = false,
  mode = "normal",
  emptyMessage = "No events to display",
  onEventClick,
  getCalendarColor,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div
        className="flex h-32 items-center justify-center text-sm text-muted-foreground"
        data-testid="event-list-empty"
      >
        {emptyMessage}
      </div>
    );
  }

  if (!groupByDate) {
    return (
      <div className="space-y-2" data-testid="event-list">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            mode={mode}
            onClick={onEventClick}
            calendarColor={getCalendarColor?.(event.calendarId)}
          />
        ))}
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce(
    (groups, event) => {
      const dateKey = new Date(event.startTime).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
      return groups;
    },
    {} as Record<string, CalendarEvent[]>,
  );

  return (
    <div className="space-y-4" data-testid="event-list-grouped">
      {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
        <div key={dateKey}>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            {dateKey}
          </h3>
          <div className="space-y-2">
            {dateEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                mode={mode}
                onClick={onEventClick}
                calendarColor={getCalendarColor?.(event.calendarId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
