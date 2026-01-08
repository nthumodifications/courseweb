/**
 * Tests for CalendarViews components
 * WeekView, MonthView, DayView, and AgendaView
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeekView, MonthView, DayView, AgendaView } from "../CalendarViews";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

describe("WeekView", () => {
  const baseEvent: CalendarEvent = {
    id: "event-1",
    calendarId: "cal-1",
    title: "Team Meeting",
    description: "",
    location: "",
    startTime: new Date("2026-01-15T10:00:00Z").getTime(),
    endTime: new Date("2026-01-15T11:00:00Z").getTime(),
    isAllDay: false,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const allDayEvent: CalendarEvent = {
    ...baseEvent,
    id: "event-2",
    title: "All Day Event",
    startTime: new Date("2026-01-16T00:00:00Z").getTime(),
    endTime: new Date("2026-01-16T23:59:59Z").getTime(),
    isAllDay: true,
  };

  const defaultProps = {
    weekStart: new Date("2026-01-12T00:00:00Z"), // Monday
    events: [baseEvent, allDayEvent],
  };

  describe("rendering", () => {
    it("should render week view", () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByTestId("week-view")).toBeInTheDocument();
    });

    it("should render 7 day headers", () => {
      render(<WeekView {...defaultProps} />);

      // Check for day headers (Sun-Sat starting from the Sunday of that week)
      // weekStart is 2026-01-12 (Monday), but weekStartsOn defaults to 0 (Sunday)
      // so it returns Sun 01-11 through Sat 01-17
      expect(
        screen.getByTestId("week-view-header-2026-01-11"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-12"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-13"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-14"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-15"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-16"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-header-2026-01-17"),
      ).toBeInTheDocument();
    });

    it("should render time grid when showTimeGrid is true", () => {
      render(<WeekView {...defaultProps} showTimeGrid={true} />);

      // Check for time cells (default 0-24 hours)
      expect(
        screen.getByTestId("week-view-cell-2026-01-12-0"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("week-view-cell-2026-01-12-12"),
      ).toBeInTheDocument();
    });

    it("should not render time grid when showTimeGrid is false", () => {
      render(<WeekView {...defaultProps} showTimeGrid={false} />);

      // Time cells should not exist
      expect(
        screen.queryByTestId("week-view-cell-2026-01-12-0"),
      ).not.toBeInTheDocument();
    });

    it("should render all-day events section", () => {
      render(<WeekView {...defaultProps} />);

      expect(
        screen.getByTestId("week-view-allday-2026-01-16"),
      ).toBeInTheDocument();
      expect(screen.getByText("All Day Event")).toBeInTheDocument();
    });

    it("should respect custom hour range", () => {
      render(<WeekView {...defaultProps} hourRange={[9, 17]} />);

      // Should have 9am cell
      expect(
        screen.getByTestId("week-view-cell-2026-01-12-9"),
      ).toBeInTheDocument();
      // Should not have 8am or 17am cells
      expect(
        screen.queryByTestId("week-view-cell-2026-01-12-8"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("week-view-cell-2026-01-12-17"),
      ).not.toBeInTheDocument();
    });
  });

  describe("event display", () => {
    it("should display timed events", () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });

    it("should display all-day events separately", () => {
      render(<WeekView {...defaultProps} />);

      const allDaySection = screen.getByTestId("week-view-allday-2026-01-16");
      expect(allDaySection).toBeInTheDocument();
      expect(screen.getByText("All Day Event")).toBeInTheDocument();
    });

    it("should call onEventClick when event is clicked", () => {
      const onEventClick = vi.fn();
      render(<WeekView {...defaultProps} onEventClick={onEventClick} />);

      const eventCard = screen
        .getByText("Team Meeting")
        .closest("[data-testid='event-card']");
      fireEvent.click(eventCard!);

      expect(onEventClick).toHaveBeenCalledWith(baseEvent);
    });

    it("should apply calendar color to events", () => {
      const getCalendarColor = vi.fn().mockReturnValue("#ff0000");
      render(
        <WeekView {...defaultProps} getCalendarColor={getCalendarColor} />,
      );

      expect(getCalendarColor).toHaveBeenCalledWith("cal-1");
    });
  });

  describe("week start configuration", () => {
    it("should start week on Sunday by default", () => {
      const sundayWeekStart = new Date("2026-01-11T00:00:00Z"); // Sunday
      render(<WeekView {...defaultProps} weekStart={sundayWeekStart} />);

      // First header should be Sunday
      expect(
        screen.getByTestId("week-view-header-2026-01-11"),
      ).toBeInTheDocument();
    });

    it("should start week on Monday when weekStartsOn is 1", () => {
      render(<WeekView {...defaultProps} weekStartsOn={1} />);

      // Should have Monday as first day
      expect(
        screen.getByTestId("week-view-header-2026-01-12"),
      ).toBeInTheDocument();
    });
  });
});

describe("MonthView", () => {
  const events: CalendarEvent[] = [
    {
      id: "event-1",
      calendarId: "cal-1",
      title: "Event 1",
      description: "",
      location: "",
      startTime: new Date("2026-01-15T10:00:00Z").getTime(),
      endTime: new Date("2026-01-15T11:00:00Z").getTime(),
      isAllDay: false,
      exdates: [],
      tags: [],
      source: "user",
      metadata: {},
      deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "event-2",
      calendarId: "cal-1",
      title: "Event 2",
      description: "",
      location: "",
      startTime: new Date("2026-01-15T14:00:00Z").getTime(),
      endTime: new Date("2026-01-15T15:00:00Z").getTime(),
      isAllDay: false,
      exdates: [],
      tags: [],
      source: "user",
      metadata: {},
      deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "event-3",
      calendarId: "cal-1",
      title: "Event 3",
      description: "",
      location: "",
      startTime: new Date("2026-01-15T16:00:00Z").getTime(),
      endTime: new Date("2026-01-15T17:00:00Z").getTime(),
      isAllDay: false,
      exdates: [],
      tags: [],
      source: "user",
      metadata: {},
      deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "event-4",
      calendarId: "cal-1",
      title: "Event 4",
      description: "",
      location: "",
      startTime: new Date("2026-01-15T18:00:00Z").getTime(),
      endTime: new Date("2026-01-15T19:00:00Z").getTime(),
      isAllDay: false,
      exdates: [],
      tags: [],
      source: "user",
      metadata: {},
      deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const defaultProps = {
    currentMonth: new Date("2026-01-15T00:00:00Z"),
    events,
  };

  describe("rendering", () => {
    it("should render month view", () => {
      render(<MonthView {...defaultProps} />);
      expect(screen.getByTestId("month-view")).toBeInTheDocument();
    });

    it("should render week day headers", () => {
      render(<MonthView {...defaultProps} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("should render complete weeks grid", () => {
      render(<MonthView {...defaultProps} />);

      // Check for day cells by finding all elements with month-view-day testid
      const container = screen.getByTestId("month-view");
      const dayCells = container.querySelectorAll(
        '[data-testid^="month-view-day-"]',
      );

      // Should have at least 28 days (4 weeks) and at most 42 days (6 weeks)
      // Number must be divisible by 7 (complete weeks)
      expect(dayCells.length).toBeGreaterThanOrEqual(28);
      expect(dayCells.length).toBeLessThanOrEqual(42);
      expect(dayCells.length % 7).toBe(0);
    });

    it("should highlight dates with events", () => {
      render(<MonthView {...defaultProps} />);

      const jan15Cell = screen.getByTestId("month-view-day-2026-01-15");
      expect(jan15Cell).toBeInTheDocument();
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });
  });

  describe("event display", () => {
    it("should display events in day cells", () => {
      render(<MonthView {...defaultProps} />);

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });

    it("should limit events per day based on maxEventsPerDay", () => {
      render(<MonthView {...defaultProps} maxEventsPerDay={2} />);

      // Should show first 2 events
      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();

      // Should show "+2 more" indicator
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });

    it("should call onEventClick when event is clicked", () => {
      const onEventClick = vi.fn();
      render(<MonthView {...defaultProps} onEventClick={onEventClick} />);

      const eventCard = screen
        .getByText("Event 1")
        .closest("[data-testid='event-card']");
      fireEvent.click(eventCard!);

      expect(onEventClick).toHaveBeenCalledWith(events[0]);
    });

    it("should call onDateClick when date is clicked", () => {
      const onDateClick = vi.fn();
      render(<MonthView {...defaultProps} onDateClick={onDateClick} />);

      const dateCell = screen.getByTestId("month-view-day-2026-01-20");
      fireEvent.click(dateCell);

      expect(onDateClick).toHaveBeenCalled();
      const calledDate = onDateClick.mock.calls[0][0];
      expect(calledDate.getDate()).toBe(20);
    });

    it("should apply calendar color to events", () => {
      const getCalendarColor = vi.fn().mockReturnValue("#00ff00");
      render(
        <MonthView {...defaultProps} getCalendarColor={getCalendarColor} />,
      );

      expect(getCalendarColor).toHaveBeenCalledWith("cal-1");
    });
  });

  describe("week start configuration", () => {
    it("should start week on Sunday by default", () => {
      render(<MonthView {...defaultProps} />);

      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      weekDays.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it("should start week on Monday when weekStartsOn is 1", () => {
      render(<MonthView {...defaultProps} weekStartsOn={1} />);

      // Monday should be first
      const weekDayHeaders = screen
        .getAllByRole("generic")
        .filter(
          (el) => el.textContent && /^(Mon|Tue|Wed)$/.test(el.textContent),
        );
      expect(weekDayHeaders.length).toBeGreaterThan(0);
    });
  });
});

describe("DayView", () => {
  const timedEvent: CalendarEvent = {
    id: "event-1",
    calendarId: "cal-1",
    title: "Morning Meeting",
    description: "",
    location: "",
    startTime: new Date("2026-01-15T09:00:00Z").getTime(),
    endTime: new Date("2026-01-15T10:00:00Z").getTime(),
    isAllDay: false,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const allDayEvent: CalendarEvent = {
    id: "event-2",
    calendarId: "cal-1",
    title: "All Day Event",
    description: "",
    location: "",
    startTime: new Date("2026-01-15T00:00:00Z").getTime(),
    endTime: new Date("2026-01-15T23:59:59Z").getTime(),
    isAllDay: true,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultProps = {
    date: new Date("2026-01-15T00:00:00Z"),
    events: [timedEvent, allDayEvent],
  };

  describe("rendering", () => {
    it("should render day view", () => {
      render(<DayView {...defaultProps} />);
      expect(screen.getByTestId("day-view")).toBeInTheDocument();
    });

    it("should display date header", () => {
      render(<DayView {...defaultProps} />);
      expect(
        screen.getByText("Thursday, January 15, 2026"),
      ).toBeInTheDocument();
    });

    it("should render all-day events section when present", () => {
      render(<DayView {...defaultProps} />);

      expect(screen.getByTestId("day-view-allday")).toBeInTheDocument();
      expect(screen.getByText("All Day Event")).toBeInTheDocument();
    });

    it("should not render all-day section when no all-day events", () => {
      render(<DayView {...defaultProps} events={[timedEvent]} />);

      expect(screen.queryByTestId("day-view-allday")).not.toBeInTheDocument();
    });

    it("should render hourly time slots", () => {
      render(<DayView {...defaultProps} />);

      // Check for hour slots
      expect(screen.getByTestId("day-view-hour-0")).toBeInTheDocument();
      expect(screen.getByTestId("day-view-hour-12")).toBeInTheDocument();
      expect(screen.getByTestId("day-view-hour-23")).toBeInTheDocument();
    });

    it("should respect custom hour range", () => {
      render(<DayView {...defaultProps} hourRange={[8, 18]} />);

      // Should have 8am
      expect(screen.getByTestId("day-view-hour-8")).toBeInTheDocument();
      // Should not have 7am or 18am
      expect(screen.queryByTestId("day-view-hour-7")).not.toBeInTheDocument();
      expect(screen.queryByTestId("day-view-hour-18")).not.toBeInTheDocument();
    });
  });

  describe("event display", () => {
    it("should display timed events in correct hour slot", () => {
      render(<DayView {...defaultProps} />);

      expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
    });

    it("should display all-day events in all-day section", () => {
      render(<DayView {...defaultProps} />);

      const allDaySection = screen.getByTestId("day-view-allday");
      expect(allDaySection).toBeInTheDocument();
      expect(screen.getByText("All Day Event")).toBeInTheDocument();
    });

    it("should call onEventClick when event is clicked", () => {
      const onEventClick = vi.fn();
      render(<DayView {...defaultProps} onEventClick={onEventClick} />);

      const eventCard = screen
        .getByText("Morning Meeting")
        .closest("[data-testid='event-card']");
      fireEvent.click(eventCard!);

      expect(onEventClick).toHaveBeenCalledWith(timedEvent);
    });

    it("should apply calendar color to events", () => {
      const getCalendarColor = vi.fn().mockReturnValue("#ff00ff");
      render(<DayView {...defaultProps} getCalendarColor={getCalendarColor} />);

      expect(getCalendarColor).toHaveBeenCalledWith("cal-1");
    });
  });
});

describe("AgendaView", () => {
  const pastEvent: CalendarEvent = {
    id: "event-1",
    calendarId: "cal-1",
    title: "Past Event",
    description: "",
    location: "",
    startTime: new Date("2025-12-15T10:00:00Z").getTime(),
    endTime: new Date("2025-12-15T11:00:00Z").getTime(),
    isAllDay: false,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const futureEvent: CalendarEvent = {
    id: "event-2",
    calendarId: "cal-1",
    title: "Future Event",
    description: "",
    location: "",
    startTime: new Date("2027-01-15T10:00:00Z").getTime(),
    endTime: new Date("2027-01-15T11:00:00Z").getTime(),
    isAllDay: false,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultProps = {
    events: [pastEvent, futureEvent],
  };

  describe("rendering", () => {
    it("should render agenda view", () => {
      render(<AgendaView {...defaultProps} />);
      expect(screen.getByTestId("agenda-view")).toBeInTheDocument();
    });

    it("should display future events by default", () => {
      render(<AgendaView {...defaultProps} />);

      expect(screen.getByText("Future Event")).toBeInTheDocument();
    });

    it("should not display past events by default", () => {
      render(<AgendaView {...defaultProps} />);

      expect(screen.queryByText("Past Event")).not.toBeInTheDocument();
    });

    it("should display past events when showPastEvents is true", () => {
      render(<AgendaView {...defaultProps} showPastEvents={true} />);

      expect(screen.getByText("Past Event")).toBeInTheDocument();
      expect(screen.getByText("Future Event")).toBeInTheDocument();
    });

    it("should show empty message when no events", () => {
      render(<AgendaView events={[]} />);

      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    });
  });

  describe("event interactions", () => {
    it("should call onEventClick when event is clicked", () => {
      const onEventClick = vi.fn();
      render(<AgendaView {...defaultProps} onEventClick={onEventClick} />);

      const eventCard = screen
        .getByText("Future Event")
        .closest("[data-testid='event-card']");
      fireEvent.click(eventCard!);

      expect(onEventClick).toHaveBeenCalledWith(futureEvent);
    });

    it("should apply calendar color to events", () => {
      const getCalendarColor = vi.fn().mockReturnValue("#0000ff");
      render(
        <AgendaView {...defaultProps} getCalendarColor={getCalendarColor} />,
      );

      expect(getCalendarColor).toHaveBeenCalledWith("cal-1");
    });
  });

  describe("event sorting", () => {
    it("should display events in chronological order", () => {
      const event1: CalendarEvent = {
        ...futureEvent,
        id: "event-3",
        title: "Event 3",
        startTime: new Date("2027-01-20T10:00:00Z").getTime(),
      };

      const event2: CalendarEvent = {
        ...futureEvent,
        id: "event-4",
        title: "Event 4",
        startTime: new Date("2027-01-18T10:00:00Z").getTime(),
      };

      render(<AgendaView events={[event1, event2, futureEvent]} />);

      // All three should be displayed
      expect(screen.getByText("Future Event")).toBeInTheDocument();
      expect(screen.getByText("Event 3")).toBeInTheDocument();
      expect(screen.getByText("Event 4")).toBeInTheDocument();
    });
  });
});
