/**
 * EventDialog - Modal for creating and editing calendar events
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { EventForm, type EventFormData } from "./EventForm";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

export interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent;
  defaultCalendarId?: string;
  defaultDate?: Date;
  onSave: (data: EventFormData) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultCalendarId,
  defaultDate,
  onSave,
  onDelete,
}: EventDialogProps) {
  const isEditing = Boolean(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="event-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="event-dialog-title">
            {isEditing ? "Edit Event" : "Create Event"}
          </DialogTitle>
        </DialogHeader>

        <EventForm
          event={event}
          defaultCalendarId={defaultCalendarId}
          defaultDate={defaultDate}
          onSave={async (data) => {
            await onSave(data);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          onDelete={
            event && onDelete
              ? async () => {
                  await onDelete(event.id);
                  onOpenChange(false);
                }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
