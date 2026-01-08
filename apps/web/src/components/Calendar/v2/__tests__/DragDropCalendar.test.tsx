import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragDropCalendar } from "../DragDropCalendar";
import { useRxDB } from "@/lib/hooks/use-rxdb";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// Mock dependencies
vi.mock("@/lib/hooks/use-rxdb");
vi.mock("@/lib/utils/calendar-event-utils", () => ({
  updateEvent: vi.fn().mockResolvedValue(undefined),
}));

// Test draggable component
function TestDraggableItem({ id, data }: { id: string; data: any }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`draggable-${id}`}
    >
      Draggable {id}
    </div>
  );
}

// Test droppable component
function TestDroppableArea({ id, data }: { id: string; data: any }) {
  const { setNodeRef } = useDroppable({
    id,
    data,
  });

  return (
    <div ref={setNodeRef} data-testid={`droppable-${id}`}>
      Droppable {id}
    </div>
  );
}

describe("DragDropCalendar", () => {
  const mockDb = {
    calendar_events: {
      find: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRxDB as any).mockReturnValue(mockDb);
  });

  it("renders children correctly", () => {
    render(
      <DragDropCalendar>
        <div data-testid="test-child">Test Content</div>
      </DragDropCalendar>,
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
  });

  it("provides drag and drop context to children", () => {
    const mockEvent = {
      id: "event-1",
      title: "Test Event",
      startTime: new Date("2024-01-15T10:00:00").getTime(),
      endTime: new Date("2024-01-15T11:00:00").getTime(),
      calendarId: "cal-1",
    };

    render(
      <DragDropCalendar>
        <TestDraggableItem id="event-1" data={{ event: mockEvent }} />
        <TestDroppableArea
          id="slot-1"
          data={{ date: new Date("2024-01-15"), time: "14:00" }}
        />
      </DragDropCalendar>,
    );

    expect(screen.getByTestId("draggable-event-1")).toBeInTheDocument();
    expect(screen.getByTestId("droppable-slot-1")).toBeInTheDocument();
  });

  it("handles missing database gracefully", () => {
    (useRxDB as any).mockReturnValue(null);

    render(
      <DragDropCalendar>
        <div data-testid="content">Content</div>
      </DragDropCalendar>,
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});
