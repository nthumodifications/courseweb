/**
 * Calendar v2 - Barrel exports
 * New calendar implementation with improved architecture
 */

// Main app
export { CalendarApp } from "./CalendarApp";

// Views
export { WeekView, MonthView, DayView, AgendaView } from "./CalendarViews";

// Components
export { EventCard, EventList } from "./EventCard";
export { CalendarControls, MiniCalendar } from "./CalendarControls";
export { EventDialog } from "./EventDialog";
export { EventForm, type EventFormData } from "./EventForm";
export { RecurrenceSelector } from "./RecurrenceSelector";
