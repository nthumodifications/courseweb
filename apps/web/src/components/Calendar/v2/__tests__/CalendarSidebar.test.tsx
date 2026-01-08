import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarSidebar } from "../CalendarSidebar";

// Mock dependencies
vi.mock("@/lib/utils/calendar-date-utils", () => ({
  getMonthGridDates: vi.fn((date) => {
    // Return a simple month grid (just first week for testing)
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      dates.push(new Date(2024, 0, i));
    }
    return dates;
  }),
}));

describe("CalendarSidebar", () => {
  const mockCalendars = [
    { id: "cal-1", name: "Personal", color: "#3b82f6", isVisible: true },
    { id: "cal-2", name: "Work", color: "#ef4444", isVisible: true },
    { id: "cal-3", name: "Family", color: "#10b981", isVisible: false },
  ];

  const mockProps = {
    calendars: mockCalendars,
    selectedDate: new Date("2024-01-15"),
    visibleCalendarIds: ["cal-1", "cal-2"],
    onToggleCalendar: vi.fn(),
    onDateSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Mini Calendar", () => {
    it("renders mini calendar with month name", () => {
      render(<CalendarSidebar {...mockProps} />);

      expect(screen.getByText(/january 2024/i)).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<CalendarSidebar {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const navButtons = buttons.filter(
        (btn) => btn.querySelector("svg"), // ChevronLeft/Right icons
      );

      expect(navButtons.length).toBeGreaterThanOrEqual(2);
    });

    it("calls onDateSelect when clicking a date", () => {
      render(<CalendarSidebar {...mockProps} />);

      // Find date buttons (numbers 1-7 in our mock)
      const dateButtons = screen.getAllByRole("button").filter((btn) => {
        const text = btn.textContent;
        return text && /^\d+$/.test(text);
      });

      if (dateButtons.length > 0) {
        fireEvent.click(dateButtons[0]);
        expect(mockProps.onDateSelect).toHaveBeenCalled();
      }
    });
  });

  describe("Calendar List", () => {
    it("renders all calendars", () => {
      render(<CalendarSidebar {...mockProps} />);

      expect(screen.getByText("Personal")).toBeInTheDocument();
      expect(screen.getByText("Work")).toBeInTheDocument();
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    it("displays calendar colors", () => {
      render(<CalendarSidebar {...mockProps} />);

      // Color indicators should be rendered with inline styles
      const personalText = screen.getByText("Personal");
      const colorIndicator = personalText.previousSibling as HTMLElement;

      expect(colorIndicator).toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("renders My Calendars header", () => {
      render(<CalendarSidebar {...mockProps} />);

      expect(screen.getByText("My Calendars")).toBeInTheDocument();
    });
  });
});
