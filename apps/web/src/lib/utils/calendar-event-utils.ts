/**
 * Calendar Event Utilities
 *
 * Utilities for creating, updating, and manipulating calendar events.
 * Provides type-safe wrappers around event operations.
 */

import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";
import { RxDatabase } from "rxdb";
import {
  createAllDayTimestamps,
  createTimedEventTimestamps,
  getUserTimezone,
} from "./calendar-date-utils";

export interface CreateEventParams {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  allDay?: boolean;
  startDate: Date;
  startHour?: number;
  startMinute?: number;
  durationMinutes?: number;
  rrule?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateEventParams {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startTime?: number;
  endTime?: number;
  allDay?: boolean;
  rrule?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EventConflict {
  event: CalendarEvent;
  overlapMinutes: number;
}

/**
 * Create a new calendar event
 */
export function createEventData(params: CreateEventParams): CalendarEvent {
  const timezone = getUserTimezone();
  const now = Date.now();

  // Calculate timestamps
  let startTime: number;
  let endTime: number;

  if (params.allDay) {
    const timestamps = createAllDayTimestamps(params.startDate, timezone);
    startTime = timestamps.startTime;
    endTime = timestamps.endTime;
  } else {
    const hour = params.startHour ?? 9;
    const minute = params.startMinute ?? 0;
    const duration = params.durationMinutes ?? 60;

    const timestamps = createTimedEventTimestamps(
      params.startDate,
      hour,
      minute,
      duration,
      timezone,
    );
    startTime = timestamps.startTime;
    endTime = timestamps.endTime;
  }

  const event: CalendarEvent = {
    id: uuidv4(),
    calendarId: params.calendarId,
    title: params.title,
    description: params.description || "",
    location: params.location || "",
    startTime,
    endTime,
    allDay: params.allDay || false,
    rrule: params.rrule,
    exdates: [],
    tags: params.tags || [],
    source: "user",
    metadata: params.metadata || {},
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };

  return event;
}

/**
 * Create event in database
 */
export async function createEvent(
  db: RxDatabase,
  params: CreateEventParams,
): Promise<CalendarEvent> {
  const eventData = createEventData(params);
  const doc = await db.calendar_events.insert(eventData);
  return doc.toJSON() as CalendarEvent;
}

/**
 * Update event in database
 */
export async function updateEvent(
  db: RxDatabase,
  params: UpdateEventParams,
): Promise<CalendarEvent | null> {
  const doc = await db.calendar_events.findOne(params.id).exec();

  if (!doc) {
    return null;
  }

  const updateData: Partial<CalendarEvent> = {
    ...params,
    updatedAt: Date.now(),
  };

  await doc.patch(updateData);
  return doc.toJSON() as CalendarEvent;
}

/**
 * Soft delete event (mark as deleted)
 */
export async function deleteEvent(
  db: RxDatabase,
  eventId: string,
): Promise<boolean> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return false;
  }

  await doc.patch({
    deleted: true,
    updatedAt: Date.now(),
  });

  return true;
}

/**
 * Hard delete event (permanently remove)
 */
export async function permanentlyDeleteEvent(
  db: RxDatabase,
  eventId: string,
): Promise<boolean> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return false;
  }

  await doc.remove();
  return true;
}

/**
 * Restore deleted event
 */
export async function restoreEvent(
  db: RxDatabase,
  eventId: string,
): Promise<boolean> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return false;
  }

  await doc.patch({
    deleted: false,
    updatedAt: Date.now(),
  });

  return true;
}

/**
 * Add exclusion date to recurring event
 */
export async function addExclusionDate(
  db: RxDatabase,
  eventId: string,
  exclusionDate: Date,
): Promise<boolean> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return false;
  }

  const event = doc.toJSON() as CalendarEvent;
  const exdates = event.exdates || [];

  if (!exdates.includes(exclusionDate.getTime())) {
    await doc.patch({
      exdates: [...exdates, exclusionDate.getTime()],
      updatedAt: Date.now(),
    });
  }

  return true;
}

/**
 * Remove exclusion date from recurring event
 */
export async function removeExclusionDate(
  db: RxDatabase,
  eventId: string,
  exclusionDate: Date,
): Promise<boolean> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return false;
  }

  const event = doc.toJSON() as CalendarEvent;
  const exdates = event.exdates || [];

  await doc.patch({
    exdates: exdates.filter((d) => d !== exclusionDate.getTime()),
    updatedAt: Date.now(),
  });

  return true;
}

/**
 * Duplicate event
 */
export async function duplicateEvent(
  db: RxDatabase,
  eventId: string,
  offsetDays: number = 7,
): Promise<CalendarEvent | null> {
  const doc = await db.calendar_events.findOne(eventId).exec();

  if (!doc) {
    return null;
  }

  const originalEvent = doc.toJSON() as CalendarEvent;
  const offset = offsetDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  const newEvent: CalendarEvent = {
    ...originalEvent,
    id: uuidv4(),
    startTime: originalEvent.startTime + offset,
    endTime: originalEvent.endTime + offset,
    rrule: undefined, // Don't duplicate recurrence
    exdates: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const newDoc = await db.calendar_events.insert(newEvent);
  return newDoc.toJSON() as CalendarEvent;
}

/**
 * Find overlapping events
 */
export async function findOverlappingEvents(
  db: RxDatabase,
  calendarId: string,
  startTime: number,
  endTime: number,
  excludeEventId?: string,
): Promise<CalendarEvent[]> {
  const events = await db.calendar_events
    .find({
      selector: {
        calendarId,
        deleted: false,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      },
    })
    .exec();

  return events
    .map((doc) => doc.toJSON() as CalendarEvent)
    .filter((event) => event.id !== excludeEventId);
}

/**
 * Check for event conflicts
 */
export async function checkEventConflicts(
  db: RxDatabase,
  calendarId: string,
  startTime: number,
  endTime: number,
  excludeEventId?: string,
): Promise<EventConflict[]> {
  const overlapping = await findOverlappingEvents(
    db,
    calendarId,
    startTime,
    endTime,
    excludeEventId,
  );

  return overlapping.map((event) => {
    const overlapStart = Math.max(startTime, event.startTime);
    const overlapEnd = Math.min(endTime, event.endTime);
    const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);

    return {
      event,
      overlapMinutes,
    };
  });
}

/**
 * Bulk delete events
 */
export async function bulkDeleteEvents(
  db: RxDatabase,
  eventIds: string[],
  permanent: boolean = false,
): Promise<number> {
  let deletedCount = 0;

  for (const eventId of eventIds) {
    const success = permanent
      ? await permanentlyDeleteEvent(db, eventId)
      : await deleteEvent(db, eventId);

    if (success) {
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Bulk update events
 */
export async function bulkUpdateEvents(
  db: RxDatabase,
  updates: Array<{ id: string; data: Partial<CalendarEvent> }>,
): Promise<number> {
  let updatedCount = 0;

  for (const { id, data } of updates) {
    const doc = await db.calendar_events.findOne(id).exec();

    if (doc) {
      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Get events by tag
 */
export async function getEventsByTag(
  db: RxDatabase,
  tag: string,
  includeDeleted: boolean = false,
): Promise<CalendarEvent[]> {
  const selector: any = {
    tags: { $elemMatch: { $eq: tag } },
  };

  if (!includeDeleted) {
    selector.deleted = false;
  }

  const events = await db.calendar_events.find({ selector }).exec();

  return events.map((doc) => doc.toJSON() as CalendarEvent);
}

/**
 * Get events by source
 */
export async function getEventsBySource(
  db: RxDatabase,
  source: "user" | "timetable" | "import",
  includeDeleted: boolean = false,
): Promise<CalendarEvent[]> {
  const selector: any = {
    source,
  };

  if (!includeDeleted) {
    selector.deleted = false;
  }

  const events = await db.calendar_events.find({ selector }).exec();

  return events.map((doc) => doc.toJSON() as CalendarEvent);
}

/**
 * Search events by title or description
 */
export async function searchEvents(
  db: RxDatabase,
  query: string,
  calendarIds?: string[],
): Promise<CalendarEvent[]> {
  const lowerQuery = query.toLowerCase();

  const selector: any = {
    deleted: false,
  };

  if (calendarIds && calendarIds.length > 0) {
    selector.calendarId = { $in: calendarIds };
  }

  const events = await db.calendar_events.find({ selector }).exec();

  return events
    .map((doc) => doc.toJSON() as CalendarEvent)
    .filter(
      (event) =>
        event.title.toLowerCase().includes(lowerQuery) ||
        event.description.toLowerCase().includes(lowerQuery) ||
        event.location.toLowerCase().includes(lowerQuery),
    );
}

/**
 * Get event statistics for a calendar
 */
export async function getCalendarStatistics(
  db: RxDatabase,
  calendarId: string,
): Promise<{
  total: number;
  deleted: number;
  recurring: number;
  allDay: number;
  tagged: number;
}> {
  const events = await db.calendar_events
    .find({
      selector: {
        calendarId,
      },
    })
    .exec();

  const eventData = events.map((doc) => doc.toJSON() as CalendarEvent);

  return {
    total: eventData.length,
    deleted: eventData.filter((e) => e.deleted).length,
    recurring: eventData.filter((e) => e.rrule).length,
    allDay: eventData.filter((e) => e.allDay).length,
    tagged: eventData.filter((e) => e.tags && e.tags.length > 0).length,
  };
}
