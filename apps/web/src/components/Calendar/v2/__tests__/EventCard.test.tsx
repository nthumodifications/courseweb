/**
 * Tests for EventCard and EventList components
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventCard, EventList } from "../EventCard";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

describe("EventCard", () => {
  const baseEvent: CalendarEvent = {
    id: "event-1",
    calendarId: "cal-1",
    title: "Test Event",
    description: "Test description",
    location: "Test Location",
    startTime: new Date("2026-01-15T10:00:00Z").getTime(),
    endTime: new Date("2026-01-15T11:00:00Z").getTime(),
    allDay: false,
    exdates: [],
    tags: ["work", "important"],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe("rendering", () => {
    it("should render event title", () => {
      render(<EventCard event={baseEvent} />);
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    it("should render event location in normal mode", () => {
      render(<EventCard event={baseEvent} mode="normal" />);
      expect(screen.getByText("Test Location")).toBeInTheDocument();
    });

    it("should not render location in compact mode", () => {
      render(<EventCard event={baseEvent} mode="compact" />);
      expect(screen.queryByText("Test Location")).not.toBeInTheDocument();
    });

    it("should render event description in detailed mode", () => {
      render(<EventCard event={baseEvent} mode="detailed" />);
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should not render description in normal mode", () => {
      render(<EventCard event={baseEvent} mode="normal" />);
      expect(screen.queryByText("Test description")).not.toBeInTheDocument();
    });

    it("should render event tags", () => {
      render(<EventCard event={baseEvent} />);
      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("important")).toBeInTheDocument();
    });

    it("should show all-day indicator for all-day events", () => {
      const allDayEvent = { ...baseEvent, allDay: true };
      render(<EventCard event={allDayEvent} />);
      expect(screen.getByText("All day")).toBeInTheDocument();
    });

    it("should show repeating indicator for recurring events", () => {
      const recurringEvent = { ...baseEvent, rrule: "FREQ=DAILY;COUNT=5" };
      render(<EventCard event={recurringEvent} />);
      expect(screen.getByText("Repeating")).toBeInTheDocument();
    });

    it("should apply strikethrough for deleted events", () => {
      const deletedEvent = { ...baseEvent, deleted: true };
      render(<EventCard event={deletedEvent} />);
      const title = screen.getByText("Test Event");
      expect(title).toHaveClass("line-through");
    });
  });

  describe("time display", () => {
    it("should show time when showTime is true", () => {
      render(<EventCard event={baseEvent} showTime={true} />);
      // Time should be displayed (format may vary based on timezone)
      const card = screen.getByTestId("event-card");
      expect(card.textContent).toMatch(/\d+:\d+/);
    });

    it("should not show time when showTime is false", () => {
      render(<EventCard event={baseEvent} showTime={false} />);
      // Check that time is not displayed for non-all-day events
      const card = screen.getByTestId("event-card");
      const hasTimePattern = /\d+:\d+ (AM|PM)/.test(card.textContent || "");
      expect(hasTimePattern).toBe(false);
    });

    it("should show duration when showDuration is true", () => {
      render(
        <EventCard event={baseEvent} showTime={true} showDuration={true} />,
      );
      expect(screen.getByText(/1h/)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      render(<EventCard event={baseEvent} onClick={onClick} />);

      const card = screen.getByTestId("event-card");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledWith(baseEvent);
    });

    it("should call onClick on Enter key", () => {
      const onClick = vi.fn();
      render(<EventCard event={baseEvent} onClick={onClick} />);

      const card = screen.getByTestId("event-card");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(onClick).toHaveBeenCalledWith(baseEvent);
    });

    it("should call onClick on Space key", () => {
      const onClick = vi.fn();
      render(<EventCard event={baseEvent} onClick={onClick} />);

      const card = screen.getByTestId("event-card");
      fireEvent.keyDown(card, { key: " " });

      expect(onClick).toHaveBeenCalledWith(baseEvent);
    });

    it("should have cursor-pointer class when onClick is provided", () => {
      const onClick = vi.fn();
      render(<EventCard event={baseEvent} onClick={onClick} />);

      const card = screen.getByTestId("event-card");
      expect(card).toHaveClass("cursor-pointer");
    });

    it("should not have cursor-pointer class when onClick is not provided", () => {
      render(<EventCard event={baseEvent} />);

      const card = screen.getByTestId("event-card");
      expect(card).not.toHaveClass("cursor-pointer");
    });
  });

  describe("styling", () => {
    it("should apply custom calendar color", () => {
      render(<EventCard event={baseEvent} calendarColor="#ff0000" />);

      const card = screen.getByTestId("event-card");
      expect(card).toHaveStyle({ borderLeftColor: "#ff0000" });
    });

    it("should apply custom className", () => {
      render(<EventCard event={baseEvent} className="custom-class" />);

      const card = screen.getByTestId("event-card");
      expect(card).toHaveClass("custom-class");
    });
  });
});

describe("EventList", () => {
  const events: CalendarEvent[] = [
    {
      id: "event-1",
      calendarId: "cal-1",
      title: "Event 1",
      description: "",
      location: "",
      startTime: new Date("2026-01-15T10:00:00Z").getTime(),
      endTime: new Date("2026-01-15T11:00:00Z").getTime(),
      allDay: false,
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
      startTime: new Date("2026-01-16T14:00:00Z").getTime(),
      endTime: new Date("2026-01-16T15:00:00Z").getTime(),
      allDay: false,
      exdates: [],
      tags: [],
      source: "user",
      metadata: {},
      deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  describe("rendering", () => {
    it("should render all events", () => {
      render(<EventList events={events} />);

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });

    it("should show empty message when no events", () => {
      render(<EventList events={[]} />);

      expect(screen.getByText("No events to display")).toBeInTheDocument();
      expect(screen.getByTestId("event-list-empty")).toBeInTheDocument();
    });

    it("should show custom empty message", () => {
      render(<EventList events={[]} emptyMessage="No upcoming events" />);

      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    });

    it("should render ungrouped list", () => {
      render(<EventList events={events} groupByDate={false} />);

      expect(screen.getByTestId("event-list")).toBeInTheDocument();
      expect(
        screen.queryByTestId("event-list-grouped"),
      ).not.toBeInTheDocument();
    });

    it("should render grouped list by date", () => {
      render(<EventList events={events} groupByDate={true} />);

      expect(screen.getByTestId("event-list-grouped")).toBeInTheDocument();
      expect(screen.queryByTestId("event-list")).not.toBeInTheDocument();
    });

    it("should group events correctly by date", () => {
      const sameDayEvents: CalendarEvent[] = [
        {
          ...events[0],
          id: "event-3",
          title: "Event 3",
          startTime: new Date("2026-01-15T12:00:00Z").getTime(),
        },
      ];

      render(
        <EventList events={[events[0], ...sameDayEvents]} groupByDate={true} />,
      );

      // Both events on Jan 15 should be under the same date heading
      const dateHeadings = screen.getAllByRole("heading");
      expect(dateHeadings).toHaveLength(1);
    });
  });

  describe("event interactions", () => {
    it("should pass onClick to event cards", () => {
      const onClick = vi.fn();
      render(<EventList events={events} onEventClick={onClick} />);

      const firstEvent = screen
        .getByText("Event 1")
        .closest("[data-testid='event-card']");
      fireEvent.click(firstEvent!);

      expect(onClick).toHaveBeenCalledWith(events[0]);
    });
  });

  describe("custom styling", () => {
    it("should pass calendar color to event cards", () => {
      const getColor = vi.fn().mockReturnValue("#ff0000");
      render(<EventList events={events} getCalendarColor={getColor} />);

      expect(getColor).toHaveBeenCalledWith("cal-1");
    });

    it("should pass mode to event cards", () => {
      render(<EventList events={events} mode="compact" />);

      // Verify compact mode is applied (e.g., by checking for smaller text)
      const cards = screen.getAllByTestId("event-card");
      cards.forEach((card) => {
        const title = card.querySelector(".font-medium");
        expect(title).toHaveClass("text-xs");
      });
    });
  });
});
