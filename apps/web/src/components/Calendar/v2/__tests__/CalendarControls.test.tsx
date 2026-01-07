/**
 * Tests for CalendarControls and MiniCalendar components
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarControls, MiniCalendar } from "../CalendarControls";

describe("CalendarControls", () => {
  const defaultProps = {
    currentView: "week" as const,
    selectedDate: new Date("2026-01-15T12:00:00Z"),
    onViewChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render calendar controls", () => {
      render(<CalendarControls {...defaultProps} />);

      expect(screen.getByTestId("calendar-controls")).toBeInTheDocument();
    });

    it("should display current month and year for week view", () => {
      render(<CalendarControls {...defaultProps} currentView="week" />);

      expect(screen.getByText("January 2026")).toBeInTheDocument();
    });

    it("should display current month and year for month view", () => {
      render(<CalendarControls {...defaultProps} currentView="month" />);

      expect(screen.getByText("January 2026")).toBeInTheDocument();
    });

    it("should display full date for day view", () => {
      render(<CalendarControls {...defaultProps} currentView="day" />);

      expect(screen.getByText("January 15, 2026")).toBeInTheDocument();
    });

    it("should display Agenda for agenda view", () => {
      render(<CalendarControls {...defaultProps} currentView="agenda" />);

      expect(
        screen.getByTestId("calendar-controls-date-label"),
      ).toHaveTextContent("Agenda");
    });

    it("should render all view buttons", () => {
      render(<CalendarControls {...defaultProps} />);

      expect(
        screen.getByTestId("calendar-controls-view-day"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("calendar-controls-view-week"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("calendar-controls-view-month"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("calendar-controls-view-agenda"),
      ).toBeInTheDocument();
    });

    it("should highlight current view", () => {
      render(<CalendarControls {...defaultProps} currentView="week" />);

      const weekButton = screen.getByTestId("calendar-controls-view-week");
      expect(weekButton).toHaveClass("bg-blue-600");
      expect(weekButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("navigation", () => {
    it("should call onToday when Today button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const todayButton = screen.getByTestId("calendar-controls-today");
      fireEvent.click(todayButton);

      expect(defaultProps.onToday).toHaveBeenCalled();
    });

    it("should call onPrevious when previous button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const prevButton = screen.getByTestId("calendar-controls-previous");
      fireEvent.click(prevButton);

      expect(defaultProps.onPrevious).toHaveBeenCalled();
    });

    it("should call onNext when next button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const nextButton = screen.getByTestId("calendar-controls-next");
      fireEvent.click(nextButton);

      expect(defaultProps.onNext).toHaveBeenCalled();
    });
  });

  describe("view switching", () => {
    it("should call onViewChange with day when day button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const dayButton = screen.getByTestId("calendar-controls-view-day");
      fireEvent.click(dayButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("day");
    });

    it("should call onViewChange with week when week button is clicked", () => {
      render(<CalendarControls {...defaultProps} currentView="day" />);

      const weekButton = screen.getByTestId("calendar-controls-view-week");
      fireEvent.click(weekButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("week");
    });

    it("should call onViewChange with month when month button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const monthButton = screen.getByTestId("calendar-controls-view-month");
      fireEvent.click(monthButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("month");
    });

    it("should call onViewChange with agenda when agenda button is clicked", () => {
      render(<CalendarControls {...defaultProps} />);

      const agendaButton = screen.getByTestId("calendar-controls-view-agenda");
      fireEvent.click(agendaButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("agenda");
    });
  });
});

describe("MiniCalendar", () => {
  const defaultProps = {
    selectedDate: new Date("2026-01-15T12:00:00Z"),
    onDateSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render mini calendar", () => {
      render(<MiniCalendar {...defaultProps} />);

      expect(screen.getByTestId("mini-calendar")).toBeInTheDocument();
    });

    it("should display current month and year", () => {
      render(<MiniCalendar {...defaultProps} />);

      expect(screen.getByText("January 2026")).toBeInTheDocument();
    });

    it("should render week day headers", () => {
      render(<MiniCalendar {...defaultProps} />);

      expect(screen.getByText("Su")).toBeInTheDocument();
      expect(screen.getByText("Mo")).toBeInTheDocument();
      expect(screen.getByText("Tu")).toBeInTheDocument();
      expect(screen.getByText("We")).toBeInTheDocument();
      expect(screen.getByText("Th")).toBeInTheDocument();
      expect(screen.getByText("Fr")).toBeInTheDocument();
      expect(screen.getByText("Sa")).toBeInTheDocument();
    });

    it("should render calendar grid with dates", () => {
      render(<MiniCalendar {...defaultProps} />);

      // Should have at least 28 days (4 weeks)
      const dayButtons = screen
        .getAllByRole("button")
        .filter((btn) => !btn.hasAttribute("aria-label"));
      expect(dayButtons.length).toBeGreaterThanOrEqual(28);
    });

    it("should highlight selected date", () => {
      render(<MiniCalendar {...defaultProps} />);

      const selectedDay = screen.getByTestId("mini-calendar-day-2026-01-15");
      expect(selectedDay).toHaveClass("bg-blue-600");
    });
  });

  describe("month navigation", () => {
    it("should navigate to previous month", () => {
      render(<MiniCalendar {...defaultProps} />);

      const prevButton = screen.getByTestId("mini-calendar-previous");
      fireEvent.click(prevButton);

      expect(screen.getByText("December 2025")).toBeInTheDocument();
    });

    it("should navigate to next month", () => {
      render(<MiniCalendar {...defaultProps} />);

      const nextButton = screen.getByTestId("mini-calendar-next");
      fireEvent.click(nextButton);

      expect(screen.getByText("February 2026")).toBeInTheDocument();
    });

    it("should maintain selected date when navigating months", () => {
      render(<MiniCalendar {...defaultProps} />);

      const nextButton = screen.getByTestId("mini-calendar-next");
      fireEvent.click(nextButton);

      // Original selected date should still be highlighted (if visible)
      const originalDate = screen.queryByTestId("mini-calendar-day-2026-01-15");
      if (originalDate) {
        expect(originalDate).toHaveClass("bg-blue-600");
      }
    });
  });

  describe("date selection", () => {
    it("should call onDateSelect when a date is clicked", () => {
      render(<MiniCalendar {...defaultProps} />);

      const dateButton = screen.getByTestId("mini-calendar-day-2026-01-20");
      fireEvent.click(dateButton);

      expect(defaultProps.onDateSelect).toHaveBeenCalled();
      const calledDate = defaultProps.onDateSelect.mock.calls[0][0];
      expect(calledDate.getDate()).toBe(20);
    });

    it("should allow selecting dates from previous month", () => {
      render(<MiniCalendar {...defaultProps} />);

      // Days from previous month should be clickable
      const allButtons = screen
        .getAllByRole("button")
        .filter((btn) => !btn.hasAttribute("aria-label"));
      const firstButton = allButtons[0];
      fireEvent.click(firstButton);

      expect(defaultProps.onDateSelect).toHaveBeenCalled();
    });

    it("should allow selecting dates from next month", () => {
      render(<MiniCalendar {...defaultProps} />);

      const allButtons = screen
        .getAllByRole("button")
        .filter((btn) => !btn.hasAttribute("aria-label"));
      const lastButton = allButtons[allButtons.length - 1];
      fireEvent.click(lastButton);

      expect(defaultProps.onDateSelect).toHaveBeenCalled();
    });
  });

  describe("event indicators", () => {
    it("should show indicators for dates with events", () => {
      const datesWithEvents = new Set([
        new Date("2026-01-15T00:00:00Z").toDateString(),
        new Date("2026-01-20T00:00:00Z").toDateString(),
      ]);

      render(
        <MiniCalendar {...defaultProps} datesWithEvents={datesWithEvents} />,
      );

      const day15 = screen.getByTestId("mini-calendar-day-2026-01-15");
      const day20 = screen.getByTestId("mini-calendar-day-2026-01-20");

      // Both should have event indicator dots
      expect(day15.querySelector(".rounded-full")).toBeInTheDocument();
      expect(day20.querySelector(".rounded-full")).toBeInTheDocument();
    });

    it("should not show indicators for dates without events", () => {
      const datesWithEvents = new Set([
        new Date("2026-01-15T00:00:00Z").toDateString(),
      ]);

      render(
        <MiniCalendar {...defaultProps} datesWithEvents={datesWithEvents} />,
      );

      const day16 = screen.getByTestId("mini-calendar-day-2026-01-16");

      // Should not have event indicator dot
      expect(day16.querySelector(".rounded-full")).not.toBeInTheDocument();
    });
  });

  describe("visual styling", () => {
    it("should dim dates from other months", () => {
      render(<MiniCalendar {...defaultProps} />);

      // Get all date buttons
      const allButtons = screen
        .getAllByRole("button")
        .filter((btn) => !btn.hasAttribute("aria-label"));

      // First few buttons are likely from previous month
      const firstButton = allButtons[0];
      expect(firstButton).toHaveClass("text-gray-400");
    });

    it("should apply custom className", () => {
      render(<MiniCalendar {...defaultProps} className="custom-class" />);

      const calendar = screen.getByTestId("mini-calendar");
      expect(calendar).toHaveClass("custom-class");
    });
  });
});
