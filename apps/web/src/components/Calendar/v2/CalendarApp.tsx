/**
 * CalendarApp - Main calendar container component
 * Wires together all calendar views, dialogs, and state management
 */

import React, { useMemo, useState } from "react";
import { useCalendarUIStore } from "@/lib/store/calendar-ui-store";
import { useCalendarEvents } from "@/lib/hooks/use-calendar-events";
import { useCalendars } from "@/lib/hooks/use-calendars";
import { CalendarControls } from "./CalendarControls";
import { WeekView, MonthView, DayView, AgendaView } from "./CalendarViews";
import { EventDialog } from "./EventDialog";
import type { EventFormData } from "./EventForm";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  type CreateEventParams,
} from "@/lib/utils/calendar-event-utils";
import { useRxDB } from "rxdb-hooks";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
} from "date-fns";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { Button } from "@courseweb/ui";
import { Plus } from "lucide-react";
import { DragDropCalendar } from "./DragDropCalendar";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarSearch } from "./CalendarSearch";

export function CalendarApp() {
  const db = useRxDB();

  // Local state for search
  const [searchQuery, setSearchQuery] = useState("");

  // UI state from Zustand
  const {
    currentView,
    selectedDate,
    visibleCalendarIds,
    eventDialogOpen,
    selectedEventId,
    setView,
    setSelectedDate,
    setVisibleCalendars,
    openEventDialog,
    closeEventDialog,
  } = useCalendarUIStore();

  // Fetch calendars
  const { calendars, loading: calendarsLoading } = useCalendars();

  // Calculate date range based on view
  const { rangeStart, rangeEnd } = useMemo(() => {
    switch (currentView) {
      case "week":
        return {
          rangeStart: startOfWeek(addWeeks(selectedDate, -1), {
            weekStartsOn: 0,
          }),
          rangeEnd: endOfWeek(addWeeks(selectedDate, 1), { weekStartsOn: 0 }),
        };
      case "month":
        return {
          rangeStart: startOfMonth(addMonths(selectedDate, -1)),
          rangeEnd: endOfMonth(addMonths(selectedDate, 1)),
        };
      case "day":
        return {
          rangeStart: new Date(selectedDate.setHours(0, 0, 0, 0)),
          rangeEnd: new Date(selectedDate.setHours(23, 59, 59, 999)),
        };
      case "agenda":
        return {
          rangeStart: new Date(),
          rangeEnd: addMonths(new Date(), 3),
        };
      default:
        return {
          rangeStart: startOfWeek(selectedDate),
          rangeEnd: endOfWeek(selectedDate),
        };
    }
  }, [currentView, selectedDate]);

  // Fetch events for current range
  const { events: allEvents, isFetching: eventsLoading } = useCalendarEvents({
    calendarIds: visibleCalendarIds,
    rangeStart,
    rangeEnd,
  });

  // Filter events based on search query
  const events = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;

    const query = searchQuery.toLowerCase();
    return allEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query),
    );
  }, [allEvents, searchQuery]);

  // Find selected event for editing
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return undefined;
    return events.find((e) => e.id === selectedEventId);
  }, [selectedEventId, events]);

  // Get calendar color
  const getCalendarColor = (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId);
    return calendar?.color || "#3b82f6";
  };

  // Navigation handlers
  const handlePrevious = () => {
    switch (currentView) {
      case "week":
        setSelectedDate(addWeeks(selectedDate, -1));
        break;
      case "month":
        setSelectedDate(addMonths(selectedDate, -1));
        break;
      case "day":
        setSelectedDate(addDays(selectedDate, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (currentView) {
      case "week":
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case "day":
        setSelectedDate(addDays(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    openEventDialog(event.id);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (currentView === "month") {
      setView("day");
    }
  };

  const handleSaveEvent = async (data: EventFormData) => {
    if (!db) throw new Error("Database not initialized");

    if (selectedEvent) {
      // Update existing event
      // Convert form data for update
      const startDateTime = data.allDay
        ? new Date(`${data.startDate}T00:00:00`)
        : new Date(`${data.startDate}T${data.startTime}`);

      const endDateTime = data.allDay
        ? new Date(`${data.endDate}T23:59:59`)
        : new Date(`${data.endDate}T${data.endTime}`);

      await updateEvent(db, {
        id: selectedEvent.id,
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        allDay: data.allDay,
        tags: data.tags,
        rrule: data.rrule,
      });
    } else {
      // Create new event
      // Parse start date and time for creation
      const startDate = new Date(data.startDate);

      const createParams: CreateEventParams = {
        calendarId: data.calendarId,
        title: data.title,
        description: data.description,
        location: data.location,
        startDate,
        allDay: data.allDay,
        tags: data.tags,
        rrule: data.rrule,
      };

      if (!data.allDay && data.startTime && data.endTime) {
        // Extract hour and minute from time string (HH:mm)
        const [startHour, startMinute] = data.startTime.split(":").map(Number);
        const [endHour, endMinute] = data.endTime.split(":").map(Number);

        // Calculate duration in minutes
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const durationMinutes = endMinutes - startMinutes;

        createParams.startHour = startHour;
        createParams.startMinute = startMinute;
        createParams.durationMinutes = durationMinutes;
      }

      await createEvent(db, createParams);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!db) throw new Error("Database not initialized");
    await deleteEvent(db, eventId);
  };

  // Calendar visibility handlers
  const handleToggleCalendar = (calendarId: string) => {
    const newVisibleIds = visibleCalendarIds.includes(calendarId)
      ? visibleCalendarIds.filter((id) => id !== calendarId)
      : [...visibleCalendarIds, calendarId];
    setVisibleCalendars(newVisibleIds);
  };

  // Time slot click handler for quick event creation
  const handleTimeSlotClick = (date: Date, time?: string) => {
    // Set the date and open dialog
    setSelectedDate(date);
    openEventDialog();
  };

  // Loading state
  if (calendarsLoading || !db) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="calendar-app-loading"
      >
        <div className="text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  return (
    <DragDropCalendar>
      <div className="flex h-full" data-testid="calendar-app">
        {/* Sidebar with calendars and mini calendar */}
        <CalendarSidebar
          calendars={calendars.map((cal) => ({
            id: cal.id,
            name: cal.name,
            color: cal.color,
            isVisible: visibleCalendarIds.includes(cal.id),
          }))}
          selectedDate={selectedDate}
          visibleCalendarIds={visibleCalendarIds}
          onToggleCalendar={handleToggleCalendar}
          onDateSelect={setSelectedDate}
        />

        {/* Main calendar area */}
        <div className="flex flex-col flex-1">
          {/* Header with controls */}
          <div className="border-b bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Calendar</h1>
              <div className="flex items-center gap-2">
                <CalendarSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-64"
                />
                <Button
                  onClick={() => openEventDialog()}
                  data-testid="calendar-app-add-event"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>

            <CalendarControls
              currentView={currentView}
              selectedDate={selectedDate}
              onViewChange={setView}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
            />
          </div>

          {/* Calendar view */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {eventsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-600">Loading events...</div>
              </div>
            ) : (
              <>
                {currentView === "week" && (
                  <WeekView
                    weekStart={selectedDate}
                    events={events}
                    onEventClick={handleEventClick}
                    getCalendarColor={getCalendarColor}
                    showTimeGrid={true}
                  />
                )}

                {currentView === "month" && (
                  <MonthView
                    currentMonth={selectedDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                    getCalendarColor={getCalendarColor}
                    maxEventsPerDay={3}
                  />
                )}

                {currentView === "day" && (
                  <DayView
                    date={selectedDate}
                    events={events}
                    onEventClick={handleEventClick}
                    getCalendarColor={getCalendarColor}
                  />
                )}

                {currentView === "agenda" && (
                  <AgendaView
                    events={events}
                    onEventClick={handleEventClick}
                    getCalendarColor={getCalendarColor}
                    showPastEvents={false}
                  />
                )}
              </>
            )}
          </div>

          {/* Event dialog */}
          <EventDialog
            open={eventDialogOpen}
            onOpenChange={closeEventDialog}
            event={selectedEvent}
            defaultCalendarId={visibleCalendarIds[0]}
            defaultDate={selectedDate}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
          />
        </div>
      </div>
    </DragDropCalendar>
  );
}
