/**
 * Tests for calendar UI store (Zustand)
 *
 * Validates:
 * - View switching (week, month, day, agenda)
 * - Date navigation (next/previous/today)
 * - Calendar visibility toggles
 * - Sidebar state management
 * - LocalStorage persistence
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendarUIStore } from "../calendar-ui-store";
import {
  addWeeks,
  addMonths,
  addDays,
  startOfWeek,
  startOfMonth,
  startOfDay,
  isSameDay,
} from "date-fns";

describe("useCalendarUIStore", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset the store to initial state by replacing with fresh values
    useCalendarUIStore.setState({
      currentView: "week",
      selectedDate: new Date(),
      visibleCalendarIds: [],
      sidebarOpen: true,
      eventDialogOpen: false,
      selectedEventId: null,
      searchQuery: "",
    });
  });

  describe("initial state", () => {
    it("should have correct default values", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      expect(result.current.currentView).toBe("week");
      expect(result.current.selectedDate).toBeInstanceOf(Date);
      expect(result.current.visibleCalendarIds).toEqual([]);
      expect(result.current.sidebarOpen).toBe(true);
    });

    it("should initialize selectedDate to today", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      const today = new Date();
      expect(isSameDay(result.current.selectedDate, today)).toBe(true);
    });
  });

  describe("view management", () => {
    it("should switch between views", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setView("month");
      });
      expect(result.current.currentView).toBe("month");

      act(() => {
        result.current.setView("day");
      });
      expect(result.current.currentView).toBe("day");

      act(() => {
        result.current.setView("agenda");
      });
      expect(result.current.currentView).toBe("agenda");

      act(() => {
        result.current.setView("week");
      });
      expect(result.current.currentView).toBe("week");
    });
  });

  describe("date navigation", () => {
    it("should set selected date", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const testDate = new Date("2026-01-15T12:00:00Z");

      act(() => {
        result.current.setSelectedDate(testDate);
      });

      expect(isSameDay(result.current.selectedDate, testDate)).toBe(true);
    });

    it("should navigate to today", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const pastDate = new Date("2020-01-01T00:00:00Z");

      // Set to past date first
      act(() => {
        result.current.setSelectedDate(pastDate);
      });
      expect(isSameDay(result.current.selectedDate, pastDate)).toBe(true);

      // Navigate to today
      act(() => {
        result.current.goToToday();
      });

      const today = new Date();
      expect(isSameDay(result.current.selectedDate, today)).toBe(true);
    });

    it("should navigate to next week in week view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-10T00:00:00Z");

      act(() => {
        result.current.setView("week");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToNextPeriod();
      });

      const expectedDate = addWeeks(initialDate, 1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });

    it("should navigate to previous week in week view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-10T00:00:00Z");

      act(() => {
        result.current.setView("week");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToPreviousPeriod();
      });

      const expectedDate = addWeeks(initialDate, -1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });

    it("should navigate to next month in month view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-15T00:00:00Z");

      act(() => {
        result.current.setView("month");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToNextPeriod();
      });

      const expectedDate = addMonths(initialDate, 1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });

    it("should navigate to previous month in month view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-15T00:00:00Z");

      act(() => {
        result.current.setView("month");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToPreviousPeriod();
      });

      const expectedDate = addMonths(initialDate, -1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });

    it("should navigate to next day in day view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-15T00:00:00Z");

      act(() => {
        result.current.setView("day");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToNextPeriod();
      });

      const expectedDate = addDays(initialDate, 1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });

    it("should navigate to previous day in day view", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const initialDate = new Date("2026-01-15T00:00:00Z");

      act(() => {
        result.current.setView("day");
        result.current.setSelectedDate(initialDate);
      });

      act(() => {
        result.current.goToPreviousPeriod();
      });

      const expectedDate = addDays(initialDate, -1);
      expect(isSameDay(result.current.selectedDate, expectedDate)).toBe(true);
    });
  });

  describe("calendar visibility management", () => {
    it("should toggle calendar visibility on", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
      });

      expect(result.current.visibleCalendarIds).toContain("cal-1");
    });

    it("should toggle calendar visibility off", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      // Add calendar first
      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
      });
      expect(result.current.visibleCalendarIds).toContain("cal-1");

      // Toggle off
      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
      });
      expect(result.current.visibleCalendarIds).not.toContain("cal-1");
    });

    it("should manage multiple calendar visibilities", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
        result.current.toggleCalendarVisibility("cal-2");
        result.current.toggleCalendarVisibility("cal-3");
      });

      expect(result.current.visibleCalendarIds).toEqual(
        expect.arrayContaining(["cal-1", "cal-2", "cal-3"]),
      );

      // Toggle one off
      act(() => {
        result.current.toggleCalendarVisibility("cal-2");
      });

      expect(result.current.visibleCalendarIds).toEqual(
        expect.arrayContaining(["cal-1", "cal-3"]),
      );
      expect(result.current.visibleCalendarIds).not.toContain("cal-2");
    });

    it("should show all calendars", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const calendarIds = ["cal-1", "cal-2", "cal-3"];

      act(() => {
        result.current.showAllCalendars(calendarIds);
      });

      expect(result.current.visibleCalendarIds).toEqual(calendarIds);
    });

    it("should hide all calendars", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      // First show some calendars
      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
        result.current.toggleCalendarVisibility("cal-2");
      });
      expect(result.current.visibleCalendarIds.length).toBe(2);

      // Hide all
      act(() => {
        result.current.hideAllCalendars();
      });

      expect(result.current.visibleCalendarIds).toEqual([]);
    });
  });

  describe("sidebar management", () => {
    it("should toggle sidebar open/closed", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);
    });

    it("should set sidebar state directly", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });
      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.setSidebarOpen(true);
      });
      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe("localStorage persistence", () => {
    it("should persist view to localStorage", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setView("month");
      });

      const stored = JSON.parse(
        localStorage.getItem("calendar-ui-store") || "{}",
      );
      expect(stored.state?.currentView).toBe("month");
    });

    it("should persist sidebar state to localStorage", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      const stored = JSON.parse(
        localStorage.getItem("calendar-ui-store") || "{}",
      );
      expect(stored.state?.sidebarOpen).toBe(false);
    });

    it("should persist visible calendar IDs to localStorage", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
        result.current.toggleCalendarVisibility("cal-2");
      });

      const stored = JSON.parse(
        localStorage.getItem("calendar-ui-store") || "{}",
      );
      expect(stored.state?.visibleCalendarIds).toEqual(
        expect.arrayContaining(["cal-1", "cal-2"]),
      );
    });

    it("should NOT persist selectedDate to localStorage", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const testDate = new Date("2026-01-15T12:00:00Z");

      act(() => {
        result.current.setSelectedDate(testDate);
      });

      const stored = JSON.parse(
        localStorage.getItem("calendar-ui-store") || "{}",
      );
      // selectedDate should not be persisted (always starts at today)
      expect(stored.state?.selectedDate).toBeUndefined();
    });
  });

  describe("complex scenarios", () => {
    it("should handle rapid view and date changes", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setView("week");
        result.current.goToNextPeriod();
        result.current.goToNextPeriod();
        result.current.setView("month");
        result.current.goToPreviousPeriod();
        result.current.setView("day");
      });

      expect(result.current.currentView).toBe("day");
      // Date should have changed appropriately based on operations
      expect(result.current.selectedDate).toBeInstanceOf(Date);
    });

    it("should maintain calendar visibility across view changes", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.toggleCalendarVisibility("cal-1");
        result.current.toggleCalendarVisibility("cal-2");
        result.current.setView("month");
        result.current.setView("day");
        result.current.setView("week");
      });

      // Calendar visibility should remain unchanged
      expect(result.current.visibleCalendarIds).toEqual(
        expect.arrayContaining(["cal-1", "cal-2"]),
      );
    });
  });

  describe("event dialog management", () => {
    it("should open event dialog without event ID", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.openEventDialog();
      });

      expect(result.current.eventDialogOpen).toBe(true);
      expect(result.current.selectedEventId).toBeNull();
    });

    it("should open event dialog with event ID", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.openEventDialog("event-123");
      });

      expect(result.current.eventDialogOpen).toBe(true);
      expect(result.current.selectedEventId).toBe("event-123");
    });

    it("should close event dialog and clear selected event", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      // Open dialog first
      act(() => {
        result.current.openEventDialog("event-123");
      });
      expect(result.current.eventDialogOpen).toBe(true);
      expect(result.current.selectedEventId).toBe("event-123");

      // Close dialog
      act(() => {
        result.current.closeEventDialog();
      });
      expect(result.current.eventDialogOpen).toBe(false);
      expect(result.current.selectedEventId).toBeNull();
    });
  });

  describe("search management", () => {
    it("should set search query", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      act(() => {
        result.current.setSearchQuery("meeting");
      });

      expect(result.current.searchQuery).toBe("meeting");
    });

    it("should clear search query", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      // Set query first
      act(() => {
        result.current.setSearchQuery("meeting");
      });
      expect(result.current.searchQuery).toBe("meeting");

      // Clear query
      act(() => {
        result.current.clearSearch();
      });
      expect(result.current.searchQuery).toBe("");
    });
  });

  describe("setVisibleCalendars", () => {
    it("should set visible calendars directly", () => {
      const { result } = renderHook(() => useCalendarUIStore());
      const calendarIds = ["cal-1", "cal-2", "cal-3"];

      act(() => {
        result.current.setVisibleCalendars(calendarIds);
      });

      expect(result.current.visibleCalendarIds).toEqual(calendarIds);
    });

    it("should replace existing visible calendars", () => {
      const { result } = renderHook(() => useCalendarUIStore());

      // Set initial calendars
      act(() => {
        result.current.setVisibleCalendars(["cal-1", "cal-2"]);
      });
      expect(result.current.visibleCalendarIds).toEqual(["cal-1", "cal-2"]);

      // Replace with new calendars
      act(() => {
        result.current.setVisibleCalendars(["cal-3", "cal-4"]);
      });
      expect(result.current.visibleCalendarIds).toEqual(["cal-3", "cal-4"]);
    });
  });
});
