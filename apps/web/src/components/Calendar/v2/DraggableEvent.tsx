/**
 * DraggableEvent - Draggable wrapper for calendar event cards
 */

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { EventCard } from "./EventCard";

interface DraggableEventProps {
  event: CalendarEvent;
  calendarColor: string;
  onClick: () => void;
  showTime?: boolean;
  className?: string;
}

export function DraggableEvent({
  event,
  calendarColor,
  onClick,
  showTime,
  className,
}: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      data: {
        event,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
    >
      <EventCard
        event={event}
        calendarColor={calendarColor}
        onClick={onClick}
        showTime={showTime}
      />
    </div>
  );
}
