/**
 * CalendarApp - Main calendar container component
 * Wires together all calendar views, dialogs, and state management
 */

import React, { useMemo } from "react";
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
} from "@/lib/utils/calendar-event-utils";
import { useRxDB } from "@/lib/hooks/use-rxdb";
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

export function CalendarApp() {
  const db = useRxDB();

  // UI state from Zustand
  const {
    currentView,
    selectedDate,
    visibleCalendarIds,
    eventDialogOpen,
    selectedEventId,
    setView,
    setSelectedDate,
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
  const { events, loading: eventsLoading } = useCalendarEvents(
    visibleCalendarIds,
    rangeStart,
    rangeEnd,
  );

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

    // Convert form data to event data
    const startDateTime = data.allDay
      ? new Date(`${data.startDate}T00:00:00`)
      : new Date(`${data.startDate}T${data.startTime}`);

    const endDateTime = data.allDay
      ? new Date(`${data.endDate}T23:59:59`)
      : new Date(`${data.endDate}T${data.endTime}`);

    const eventData = {
      calendarId: data.calendarId,
      title: data.title,
      description: data.description || "",
      location: data.location || "",
      startTime: startDateTime.getTime(),
      endTime: endDateTime.getTime(),
      allDay: data.allDay,
      tags: data.tags,
      rrule: data.rrule,
      source: "user" as const,
    };

    if (selectedEvent) {
      // Update existing event
      await updateEvent(db, {
        id: selectedEvent.id,
        ...eventData,
      });
    } else {
      // Create new event
      await createEvent(db, eventData);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!db) throw new Error("Database not initialized");
    await deleteEvent(db, eventId);
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
    <div className="flex flex-col h-full" data-testid="calendar-app">
      {/* Header with controls */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <Button
            onClick={() => openEventDialog()}
            data-testid="calendar-app-add-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
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
  );
}
