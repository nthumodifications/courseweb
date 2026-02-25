/**
 * Calendar v2 - Barrel exports
 * New calendar implementation with improved architecture
 */

// Main app
export { CalendarApp } from "./CalendarApp";
export { CalendarAppWithTimetable } from "./CalendarAppWithTimetable";

// Views
export { WeekView, MonthView, DayView, AgendaView } from "./CalendarViews";

// Components
export { EventCard, EventList } from "./EventCard";
export { CalendarControls, MiniCalendar } from "./CalendarControls";
export { EventDialog } from "./EventDialog";
export { EventForm, type EventFormData } from "./EventForm";
export { RecurrenceSelector } from "./RecurrenceSelector";
export { CalendarSidebar } from "./CalendarSidebar";
export { CalendarSearch } from "./CalendarSearch";

// Drag and drop
export { DragDropCalendar } from "./DragDropCalendar";
export { DraggableEvent } from "./DraggableEvent";
export { DroppableTimeSlot } from "./DroppableTimeSlot";
