/**
 * EventForm - Form for creating and editing calendar events
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label, Textarea, Switch, Badge } from "@courseweb/ui";
import { CalendarIcon, Clock, MapPin, Tag, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { RecurrenceSelector } from "./RecurrenceSelector";

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Form validation schema
const eventFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    calendarId: z.string().min(1, "Calendar is required"),
    isAllDay: z.boolean(),
    startDate: z.string(), // ISO date string
    startTime: z.string().optional(), // HH:mm format
    endDate: z.string(), // ISO date string
    endTime: z.string().optional(), // HH:mm format
    tags: z.array(z.string()),
    rrule: z.string().optional(),
  })
  .refine(
    (data) => {
      // If not all-day, time fields are required
      if (!data.isAllDay) {
        return Boolean(data.startTime && data.endTime);
      }
      return true;
    },
    {
      message: "Start and end times are required for timed events",
      path: ["startTime"],
    },
  )
  .refine(
    (data) => {
      // End must be after start
      const startDateTime = new Date(
        `${data.startDate}T${data.startTime || "00:00"}`,
      );
      const endDateTime = new Date(
        `${data.endDate}T${data.endTime || "23:59"}`,
      );
      return endDateTime > startDateTime;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export type EventFormData = z.infer<typeof eventFormSchema>;

export interface EventFormProps {
  event?: CalendarEvent;
  defaultCalendarId?: string;
  defaultDate?: Date;
  onSave: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export function EventForm({
  event,
  defaultCalendarId = "default",
  defaultDate = new Date(),
  onSave,
  onCancel,
  onDelete,
}: EventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Initialize form with event data or defaults
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description || "",
          location: event.location || "",
          calendarId: event.calendarId,
          isAllDay: event.isAllDay,
          startDate: format(new Date(event.startTime), "yyyy-MM-dd"),
          startTime: event.isAllDay
            ? undefined
            : format(new Date(event.startTime), "HH:mm"),
          endDate: format(new Date(event.endTime), "yyyy-MM-dd"),
          endTime: event.isAllDay
            ? undefined
            : format(new Date(event.endTime), "HH:mm"),
          tags: event.tags || [],
          rrule: event.rrule,
        }
      : {
          title: "",
          description: "",
          location: "",
          calendarId: defaultCalendarId,
          isAllDay: false,
          startDate: format(defaultDate, "yyyy-MM-dd"),
          startTime: format(defaultDate, "HH:mm"),
          endDate: format(defaultDate, "yyyy-MM-dd"),
          endTime: format(
            new Date(defaultDate.getTime() + DEFAULT_EVENT_DURATION_MS),
            "HH:mm",
          ),
          tags: [],
          rrule: undefined,
        },
  });

  const isAllDay = watch("isAllDay");
  const tags = watch("tags");
  const rrule = watch("rrule");

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue("tags", [...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      data-testid="event-form"
    >
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          data-testid="event-form-title"
          placeholder="Event title"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-red-500" data-testid="title-error">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* All-day toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="all-day"
          data-testid="event-form-allday"
          checked={isAllDay}
          onCheckedChange={(checked) => setValue("isAllDay", checked)}
        />
        <Label htmlFor="all-day" className="cursor-pointer">
          All-day event
        </Label>
      </div>

      {/* Date and time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            Start Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="start-date"
            type="date"
            data-testid="event-form-start-date"
            {...register("startDate")}
          />
        </div>

        {!isAllDay && (
          <div className="space-y-2">
            <Label htmlFor="start-time" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Start Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="start-time"
              type="time"
              data-testid="event-form-start-time"
              {...register("startTime")}
            />
            {errors.startTime && (
              <p
                className="text-sm text-red-500"
                data-testid="start-time-error"
              >
                {errors.startTime.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="end-date">
            End Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="end-date"
            type="date"
            data-testid="event-form-end-date"
            {...register("endDate")}
          />
        </div>

        {!isAllDay && (
          <div className="space-y-2">
            <Label htmlFor="end-time">
              End Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="end-time"
              type="time"
              data-testid="event-form-end-time"
              {...register("endTime")}
            />
            {errors.endTime && (
              <p className="text-sm text-red-500" data-testid="end-time-error">
                {errors.endTime.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Input
          id="location"
          data-testid="event-form-location"
          placeholder="Add location"
          {...register("location")}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          data-testid="event-form-description"
          placeholder="Add description"
          rows={3}
          {...register("description")}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tag-input" className="flex items-center gap-1">
          <Tag className="h-4 w-4" />
          Tags
        </Label>
        <div className="flex gap-2">
          <Input
            id="tag-input"
            data-testid="event-form-tag-input"
            placeholder="Add tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            data-testid="event-form-add-tag"
          >
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
                data-testid={`event-form-tag-${tag}`}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-500"
                  data-testid={`event-form-remove-tag-${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Recurrence */}
      <RecurrenceSelector
        value={rrule}
        onChange={(newRrule) => setValue("rrule", newRrule)}
        startDate={watch("startDate")}
      />

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              data-testid="event-form-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="event-form-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="event-form-save"
          >
            {isSubmitting
              ? "Saving..."
              : event
                ? "Save Changes"
                : "Create Event"}
          </Button>
        </div>
      </div>
    </form>
  );
}
