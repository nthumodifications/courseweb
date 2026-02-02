/**
 * CalendarSidebar - Sidebar with calendar list and mini calendar
 */

import React from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Settings,
} from "lucide-react";
import { Button, cn } from "@courseweb/ui";
import { getMonthGridDates } from "@/lib/utils/calendar-date-utils";

interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

interface CalendarSidebarProps {
  calendars: Calendar[];
  selectedDate: Date;
  visibleCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  onDateSelect: (date: Date) => void;
  onAddCalendar?: () => void;
  onManageCalendars?: () => void;
}

export function CalendarSidebar({
  calendars,
  selectedDate,
  visibleCalendarIds,
  onToggleCalendar,
  onDateSelect,
  onAddCalendar,
  onManageCalendars,
}: CalendarSidebarProps) {
  const [miniCalendarDate, setMiniCalendarDate] = React.useState(new Date());

  const gridDates = getMonthGridDates(miniCalendarDate, "UTC", 0);

  const handlePrevMonth = () => {
    setMiniCalendarDate(subMonths(miniCalendarDate, 1));
  };

  const handleNextMonth = () => {
    setMiniCalendarDate(addMonths(miniCalendarDate, 1));
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isSelected = (date: Date) => isSameDay(date, selectedDate);
  const isCurrentMonth = (date: Date) => isSameMonth(date, miniCalendarDate);

  return (
    <div className="w-64 bg-background border-r border flex flex-col h-full">
      {/* Mini Calendar */}
      <div className="p-4 border-b border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">
            {format(miniCalendarDate, "MMMM yyyy")}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div
              key={i}
              className="text-center font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
          {gridDates.map((date, i) => (
            <button
              key={i}
              onClick={() => handleDateClick(date)}
              className={cn(
                "aspect-square rounded-sm text-center hover:bg-muted transition-colors",
                !isCurrentMonth(date) && "text-muted-foreground/50",
                isToday(date) && "bg-primary/10 text-primary font-semibold",
                isSelected(date) && "bg-primary text-white hover:bg-primary/90",
              )}
            >
              {format(date, "d")}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">My Calendars</h3>
            <div className="flex gap-1">
              {onAddCalendar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onAddCalendar}
                  title="Add calendar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {onManageCalendars && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onManageCalendars}
                  title="Manage calendars"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 overflow-y-auto">
          <div className="space-y-2 py-2">
            {calendars.map((calendar) => {
              const isVisible = visibleCalendarIds.includes(calendar.id);
              return (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between group hover:bg-muted p-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: calendar.color }}
                    />
                    <span className="text-sm truncate text-foreground">
                      {calendar.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleCalendar(calendar.id)}
                    className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                    title={isVisible ? "Hide calendar" : "Show calendar"}
                  >
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
