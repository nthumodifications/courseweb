/**
 * RxDB Schema for Calendar V2
 *
 * This file contains the new calendar schemas for the reimplementation.
 * These use best practices: proper indexes, standard formats (RRULE),
 * and efficient data types (unix timestamps instead of ISO strings).
 */

import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb";

/**
 * Calendar Events Schema (v0)
 *
 * This is v0 because it's a fresh start with a new collection name.
 * Benefits over old schema:
 * - Unix timestamps for better performance and timezone handling
 * - RRULE for standard recurrence (compatible with iCalendar)
 * - Proper indexes for efficient queries
 * - Multi-calendar support built-in
 * - Soft deletes for sync
 * - Source tracking (user, timetable, import)
 */
export const calendarEventsSchemaV0 = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    calendarId: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
    },
    description: {
      type: "string",
    },
    location: {
      type: "string",
    },
    isAllDay: {
      type: "boolean",
    },
    startTime: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999, // Max timestamp
    },
    endTime: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999,
    },
    timezone: {
      type: "string",
      maxLength: 100,
    },
    // Recurrence using standard RRULE format
    rrule: {
      type: "string",
    },
    exdates: {
      type: "array",
      items: {
        type: "number",
        minimum: 0,
        maximum: 9999999999999,
      },
    },
    recurrenceId: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999,
    },
    // Metadata
    color: {
      type: "string",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
      },
    },
    source: {
      type: "string",
      enum: ["user", "timetable", "import"],
    },
    sourceId: {
      type: "string",
    },
    // Sync fields
    lastModified: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999,
    },
    deleted: {
      type: "boolean",
    },
    // Future features
    reminders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          minutes: {
            type: "number",
          },
          method: {
            type: "string",
            enum: ["notification", "email"],
          },
        },
        required: ["id", "minutes", "method"],
      },
    },
  },
  required: [
    "id",
    "calendarId",
    "title",
    "isAllDay",
    "startTime",
    "endTime",
    "timezone",
    "lastModified",
    "deleted",
  ],
  indexes: [
    "calendarId", // Filter by calendar
    "startTime", // Sort by start time
    "endTime", // Query by end time
    ["startTime", "endTime"], // Compound index for efficient range queries
    "source", // Filter by source
    "deleted", // Filter out deleted
    "lastModified", // For sync
    ["calendarId", "deleted", "startTime"], // Compound for common query pattern
  ],
} as const;

export const calendarEventsSchemaTyped = toTypedRxJsonSchema(
  calendarEventsSchemaV0,
);

export type CalendarEventDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof calendarEventsSchemaTyped
>;

/**
 * Calendars Schema (v0)
 *
 * Multi-calendar support for organizing events.
 * Can represent user calendars, timetable calendars, or subscribed calendars.
 */
export const calendarsSchemaV0 = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    name: {
      type: "string",
    },
    description: {
      type: "string",
    },
    color: {
      type: "string",
      maxLength: 20,
    },
    isDefault: {
      type: "boolean",
    },
    isVisible: {
      type: "boolean",
    },
    source: {
      type: "string",
      enum: ["user", "timetable", "subscription"],
    },
    // For timetable-sourced calendars
    semesterId: {
      type: "string",
    },
    // For subscribed calendars
    subscriptionUrl: {
      type: "string",
    },
    lastSync: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999,
    },
    // Sync fields
    lastModified: {
      type: "number",
      minimum: 0,
      maximum: 9999999999999,
    },
    deleted: {
      type: "boolean",
    },
  },
  required: [
    "id",
    "name",
    "color",
    "isDefault",
    "isVisible",
    "source",
    "lastModified",
    "deleted",
  ],
  indexes: ["source", "isVisible", "deleted", "lastModified"],
} as const;

export const calendarsSchemaTyped = toTypedRxJsonSchema(calendarsSchemaV0);

export type CalendarDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof calendarsSchemaTyped
>;

/**
 * Runtime types for working with events
 */
export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  timezone: string; // IANA timezone

  rrule?: string; // RRULE string
  exdates?: number[]; // Excluded dates as timestamps
  recurrenceId?: number; // For edited instances

  color?: string;
  tags: string[];
  source: "user" | "timetable" | "import";
  sourceId?: string;

  lastModified: number;
  deleted: boolean;

  reminders?: Array<{
    id: string;
    minutes: number;
    method: "notification" | "email";
  }>;
}

/**
 * Event instance (expanded from recurring event)
 */
export interface EventInstance extends CalendarEvent {
  instanceStart: number; // Actual start time of this instance
  instanceEnd: number; // Actual end time of this instance
  isRecurringInstance: boolean;
  originalEventId: string; // ID of the parent recurring event
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  source: "user" | "timetable" | "subscription";
  semesterId?: string;
  subscriptionUrl?: string;
  lastSync?: number;
  lastModified: number;
  deleted: boolean;
}
