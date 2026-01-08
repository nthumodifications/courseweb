/**
 * DragDropCalendar - Drag and drop wrapper for calendar views
 * Enables dragging events to different times and days
 */

import React, { useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { updateEvent } from "@/lib/utils/calendar-event-utils";
import { useRxDB } from "rxdb-hooks";
import { parse, addMinutes } from "date-fns";

interface DragDropCalendarProps {
  children: React.ReactNode;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
}

export function DragDropCalendar({
  children,
  onDragStart,
  onDragEnd,
}: DragDropCalendarProps) {
  const db = useRxDB();
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const eventData = event.active.data.current?.event as CalendarEvent;
      if (eventData) {
        setActiveEvent(eventData);
        onDragStart?.(eventData);
      }
    },
    [onDragStart],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !db) {
        setActiveEvent(null);
        onDragEnd?.();
        return;
      }

      const draggedEvent = active.data.current?.event as CalendarEvent;
      const dropTarget = over.data.current;

      if (!draggedEvent || !dropTarget) {
        setActiveEvent(null);
        onDragEnd?.();
        return;
      }

      // Calculate new start and end times based on drop target
      const { date, time } = dropTarget;
      if (!date) {
        setActiveEvent(null);
        onDragEnd?.();
        return;
      }

      // Parse drop target date and time
      let newStartTime: Date;
      if (time !== undefined) {
        // Time slot drop - use specified time
        const [hours, minutes] = time.split(":").map(Number);
        newStartTime = new Date(date);
        newStartTime.setHours(hours, minutes, 0, 0);
      } else {
        // All-day or date-only drop
        newStartTime = new Date(date);
        newStartTime.setHours(0, 0, 0, 0);
      }

      // Calculate duration of original event
      const originalDuration = draggedEvent.endTime - draggedEvent.startTime;

      // Set new end time based on duration
      const newEndTime = addMinutes(newStartTime, originalDuration / 60000);

      try {
        await updateEvent(db, {
          id: draggedEvent.id,
          startTime: newStartTime.getTime(),
          endTime: newEndTime.getTime(),
        });
      } catch (error) {
        console.error("Failed to update event:", error);
      }

      setActiveEvent(null);
      onDragEnd?.();
    },
    [db, onDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    setActiveEvent(null);
    onDragEnd?.();
  }, [onDragEnd]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeEvent ? (
          <div className="bg-blue-500 text-white p-2 rounded shadow-lg opacity-90">
            {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
