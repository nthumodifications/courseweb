/**
 * Calendar UI State Store (Zustand)
 *
 * This store manages UI state for the calendar (NOT data - data lives in RxDB).
 * - Current view (week/month/day/agenda)
 * - Selected date
 * - Visible calendars
 * - UI preferences (sidebar open, etc.)
 *
 * Benefits:
 * - Clean separation: RxDB for data, Zustand for UI
 * - Persisted preferences
 * - No prop drilling
 * - Easy to test
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CalendarView = "week" | "month" | "day" | "agenda";

interface CalendarUIStore {
  // View state
  currentView: CalendarView;
  selectedDate: Date;

  // Calendar filters
  visibleCalendarIds: string[];

  // UI state
  sidebarOpen: boolean;
  eventDialogOpen: boolean;
  selectedEventId: string | null;

  // Search
  searchQuery: string;

  // Actions - View
  setView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  goToToday: () => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;

  // Actions - Calendar filters
  toggleCalendarVisibility: (calendarId: string) => void;
  setVisibleCalendars: (calendarIds: string[]) => void;
  showAllCalendars: (allCalendarIds: string[]) => void;
  hideAllCalendars: () => void;

  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openEventDialog: (eventId?: string) => void;
  closeEventDialog: () => void;

  // Actions - Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Helper to calculate next/previous period based on current view
 */
function getNextPeriod(date: Date, view: CalendarView): Date {
  const newDate = new Date(date);
  switch (view) {
    case "week":
      newDate.setDate(newDate.getDate() + 7);
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case "day":
      newDate.setDate(newDate.getDate() + 1);
      break;
    case "agenda":
      // Agenda view doesn't have period navigation
      break;
  }
  return newDate;
}

function getPreviousPeriod(date: Date, view: CalendarView): Date {
  const newDate = new Date(date);
  switch (view) {
    case "week":
      newDate.setDate(newDate.getDate() - 7);
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() - 1);
      break;
    case "day":
      newDate.setDate(newDate.getDate() - 1);
      break;
    case "agenda":
      // Agenda view doesn't have period navigation
      break;
  }
  return newDate;
}

export const useCalendarUIStore = create<CalendarUIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: "week",
      selectedDate: new Date(),
      visibleCalendarIds: [],
      sidebarOpen: true,
      eventDialogOpen: false,
      selectedEventId: null,
      searchQuery: "",

      // View actions
      setView: (view) => set({ currentView: view }),

      setSelectedDate: (date) => set({ selectedDate: date }),

      goToToday: () => set({ selectedDate: new Date() }),

      goToNextPeriod: () => {
        const { selectedDate, currentView } = get();
        set({ selectedDate: getNextPeriod(selectedDate, currentView) });
      },

      goToPreviousPeriod: () => {
        const { selectedDate, currentView } = get();
        set({ selectedDate: getPreviousPeriod(selectedDate, currentView) });
      },

      // Calendar filter actions
      toggleCalendarVisibility: (calendarId) => {
        const { visibleCalendarIds } = get();
        const isVisible = visibleCalendarIds.includes(calendarId);

        set({
          visibleCalendarIds: isVisible
            ? visibleCalendarIds.filter((id) => id !== calendarId)
            : [...visibleCalendarIds, calendarId],
        });
      },

      setVisibleCalendars: (calendarIds) =>
        set({ visibleCalendarIds: calendarIds }),

      showAllCalendars: (allCalendarIds) =>
        set({ visibleCalendarIds: allCalendarIds }),

      hideAllCalendars: () => set({ visibleCalendarIds: [] }),

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      openEventDialog: (eventId) =>
        set({
          eventDialogOpen: true,
          selectedEventId: eventId || null,
        }),

      closeEventDialog: () =>
        set({
          eventDialogOpen: false,
          selectedEventId: null,
        }),

      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),

      clearSearch: () => set({ searchQuery: "" }),
    }),
    {
      name: "calendar-ui-store", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        currentView: state.currentView,
        sidebarOpen: state.sidebarOpen,
        visibleCalendarIds: state.visibleCalendarIds,
      }),
    },
  ),
);

/**
 * Selector hooks for better performance
 * Only re-render when specific values change
 */
export const useCurrentView = () =>
  useCalendarUIStore((state) => state.currentView);
export const useSelectedDate = () =>
  useCalendarUIStore((state) => state.selectedDate);
export const useVisibleCalendarIds = () =>
  useCalendarUIStore((state) => state.visibleCalendarIds);
export const useSidebarOpen = () =>
  useCalendarUIStore((state) => state.sidebarOpen);
export const useEventDialogState = () =>
  useCalendarUIStore((state) => ({
    open: state.eventDialogOpen,
    eventId: state.selectedEventId,
  }));
export const useSearchQuery = () =>
  useCalendarUIStore((state) => state.searchQuery);
