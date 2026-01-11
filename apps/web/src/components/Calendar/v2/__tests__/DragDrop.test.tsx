import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { DraggableEvent } from "../DraggableEvent";
import { DroppableTimeSlot } from "../DroppableTimeSlot";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

// Mock EventCard component
vi.mock("../EventCard", () => ({
  EventCard: ({ event, color, onClick }: any) => (
    <div
      data-testid="event-card"
      onClick={onClick}
      style={{ backgroundColor: color }}
    >
      {event.title}
    </div>
  ),
}));

describe("DraggableEvent", () => {
  const mockEvent: CalendarEvent = {
    id: "event-1",
    calendarId: "cal-1",
    title: "Test Event",
    description: "Test Description",
    location: "Test Location",
    startTime: new Date("2024-01-15T10:00:00").getTime(),
    endTime: new Date("2024-01-15T11:00:00").getTime(),
    isAllDay: false,
    tags: [],
    source: "user" as const,
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders event card", () => {
    render(
      <DndContext>
        <DraggableEvent
          event={mockEvent}
          calendarColor="#3b82f6"
          onClick={mockOnClick}
        />
      </DndContext>,
    );

    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("applies correct color", () => {
    render(
      <DndContext>
        <DraggableEvent
          event={mockEvent}
          calendarColor="#ef4444"
          onClick={mockOnClick}
        />
      </DndContext>,
    );

    const eventCard = screen.getByTestId("event-card");
    expect(eventCard).toHaveStyle({ backgroundColor: "#ef4444" });
  });
});

describe("DroppableTimeSlot", () => {
  const testDate = new Date("2024-01-15T14:00:00");

  it("renders children", () => {
    render(
      <DndContext>
        <DroppableTimeSlot date={testDate}>
          <div data-testid="slot-content">Slot Content</div>
        </DroppableTimeSlot>
      </DndContext>,
    );

    expect(screen.getByTestId("slot-content")).toBeInTheDocument();
  });

  it("renders with time slot", () => {
    render(
      <DndContext>
        <DroppableTimeSlot date={testDate} time="14:00">
          <div>14:00 Slot</div>
        </DroppableTimeSlot>
      </DndContext>,
    );

    expect(screen.getByText("14:00 Slot")).toBeInTheDocument();
  });
});
