/**
 * CalendarControls Component
 *
 * Navigation and view controls for the calendar
 */

import React from "react";
import { format } from "date-fns";
import type { CalendarView } from "@/lib/store/calendar-ui-store";
import { cn } from "@courseweb/ui";

export interface CalendarControlsProps {
  /**
   * Current view mode
   */
  currentView: CalendarView;
  /**
   * Currently selected date
   */
  selectedDate: Date;
  /**
   * View change handler
   */
  onViewChange: (view: CalendarView) => void;
  /**
   * Navigate to previous period
   */
  onPrevious: () => void;
  /**
   * Navigate to next period
   */
  onNext: () => void;
  /**
   * Navigate to today
   */
  onToday: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function CalendarControls({
  currentView,
  selectedDate,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  className,
}: CalendarControlsProps) {
  const getDateLabel = () => {
    switch (currentView) {
      case "day":
        return format(selectedDate, "MMMM d, yyyy");
      case "week":
        return format(selectedDate, "MMMM yyyy");
      case "month":
        return format(selectedDate, "MMMM yyyy");
      case "agenda":
        return "Agenda";
      default:
        return format(selectedDate, "MMMM yyyy");
    }
  };

  const views: Array<{ value: CalendarView; label: string }> = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "agenda", label: "Agenda" },
  ];

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border bg-background px-4 py-3",
        className,
      )}
      data-testid="calendar-controls"
    >
      {/* Left: Date Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="rounded border border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50"
          data-testid="calendar-controls-today"
        >
          Today
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrevious}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted/50"
            aria-label="Previous period"
            data-testid="calendar-controls-previous"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={onNext}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted/50"
            aria-label="Next period"
            data-testid="calendar-controls-next"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <h2
          className="text-lg font-semibold text-foreground"
          data-testid="calendar-controls-date-label"
        >
          {getDateLabel()}
        </h2>
      </div>

      {/* Right: View Switcher */}
      <div
        className="flex rounded-md border border"
        role="group"
        aria-label="Calendar view"
        data-testid="calendar-controls-view-switcher"
      >
        {views.map((view, index) => (
          <button
            key={view.value}
            onClick={() => onViewChange(view.value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              index === 0 && "rounded-l-md",
              index === views.length - 1 && "rounded-r-md",
              index > 0 && "border-l border",
              currentView === view.value
                ? "bg-primary text-white"
                : "bg-background text-foreground hover:bg-muted/50",
            )}
            data-testid={`calendar-controls-view-${view.value}`}
            aria-pressed={currentView === view.value}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * MiniCalendar Component
 *
 * Small calendar for date selection
 */

export interface MiniCalendarProps {
  /**
   * Currently selected date
   */
  selectedDate: Date;
  /**
   * Date selection handler
   */
  onDateSelect: (date: Date) => void;
  /**
   * Dates with events (for highlighting)
   */
  datesWithEvents?: Set<string>;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MiniCalendar({
  selectedDate,
  onDateSelect,
  datesWithEvents,
  className,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add days from previous month to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push(prevDate);
    }

    // Add all days in current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const hasEvents = (date: Date) => {
    const dateKey = date.toDateString();
    return datesWithEvents?.has(dateKey);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-lg border border bg-background p-4",
        className,
      )}
      data-testid="mini-calendar"
    >
      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="rounded p-1 hover:bg-muted/50"
          aria-label="Previous month"
          data-testid="mini-calendar-previous"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div
          className="text-sm font-semibold"
          data-testid="mini-calendar-month-label"
        >
          {format(currentMonth, "MMMM yyyy")}
        </div>

        <button
          onClick={goToNextMonth}
          className="rounded p-1 hover:bg-muted/50"
          aria-label="Next month"
          data-testid="mini-calendar-next"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Week Days Header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={cn(
              "relative aspect-square rounded p-1 text-sm",
              isCurrentMonth(date)
                ? "text-foreground"
                : "text-muted-foreground/50",
              isToday(date) && "font-bold",
              isSelected(date) && "bg-primary text-white",
              !isSelected(date) && "hover:bg-muted/50",
            )}
            data-testid={`mini-calendar-day-${format(date, "yyyy-MM-dd")}`}
          >
            {date.getDate()}
            {hasEvents(date) && (
              <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
