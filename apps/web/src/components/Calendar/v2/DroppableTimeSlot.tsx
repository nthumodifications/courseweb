/**
 * DroppableTimeSlot - Droppable time slot for calendar grid
 */

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@courseweb/ui";

interface DroppableTimeSlotProps {
  date: Date;
  time?: string; // HH:mm format
  children?: React.ReactNode;
  className?: string;
}

export function DroppableTimeSlot({
  date,
  time,
  children,
  className,
}: DroppableTimeSlotProps) {
  const id = time
    ? `slot-${date.toISOString()}-${time}`
    : `slot-${date.toISOString()}`;

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      time,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-colors",
        isOver && "bg-blue-50 ring-2 ring-blue-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
