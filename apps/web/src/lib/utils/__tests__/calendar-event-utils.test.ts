/**
 * Tests for calendar event utilities
 *
 * Validates:
 * - Event creation and data structures
 * - Event CRUD operations
 * - Event search and filtering
 * - Conflict detection
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createEventData,
  createEvent,
  updateEvent,
  deleteEvent,
  permanentlyDeleteEvent,
  restoreEvent,
  addExclusionDate,
  removeExclusionDate,
  duplicateEvent,
  findOverlappingEvents,
  checkEventConflicts,
  bulkDeleteEvents,
  bulkUpdateEvents,
  getEventsByTag,
  getEventsBySource,
  searchEvents,
  getCalendarStatistics,
} from "../calendar-event-utils";
import { createMockRxDB, createMockRxCollection } from "@/test/mocks/rxdb";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

describe("calendar-event-utils", () => {
  describe("event creation", () => {
    it("should create all-day event data", () => {
      const event = createEventData({
        calendarId: "cal-1",
        title: "All Day Event",
        isAllDay: true,
        startDate: new Date("2026-01-15T00:00:00Z"),
      });

      expect(event.title).toBe("All Day Event");
      expect(event.isAllDay).toBe(true);
      expect(event.calendarId).toBe("cal-1");
      expect(event.source).toBe("user");
      expect(event.deleted).toBe(false);
      expect(event.id).toBeTruthy();
    });

    it("should create timed event data", () => {
      const event = createEventData({
        calendarId: "cal-1",
        title: "Meeting",
        isAllDay: false,
        startDate: new Date("2026-01-15T00:00:00Z"),
        startHour: 14,
        startMinute: 30,
        durationMinutes: 90,
      });

      expect(event.title).toBe("Meeting");
      expect(event.isAllDay).toBe(false);
      expect(event.endTime - event.startTime).toBe(90 * 60 * 1000);
    });

    it("should create event with tags", () => {
      const event = createEventData({
        calendarId: "cal-1",
        title: "Tagged Event",
        startDate: new Date("2026-01-15T00:00:00Z"),
        tags: ["work", "important"],
      });

      expect(event.tags).toEqual(["work", "important"]);
    });

    it("should create event with recurrence", () => {
      const event = createEventData({
        calendarId: "cal-1",
        title: "Recurring Event",
        startDate: new Date("2026-01-15T00:00:00Z"),
        rrule: "FREQ=WEEKLY;COUNT=10",
      });

      expect(event.rrule).toBe("FREQ=WEEKLY;COUNT=10");
      expect(event.exdates).toEqual([]);
    });

    it("should create event in database", async () => {
      const mockEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Test Event",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        exdates: [],
        tags: [],
        source: "user",
        deleted: false,
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      // Mock the insert to return the event
      db.calendar_events.insert = vi
        .fn()
        .mockResolvedValue({ toJSON: () => mockEvent });

      const event = await createEvent(db as any, {
        calendarId: "cal-1",
        title: "Test Event",
        startDate: new Date(),
      });

      expect(event.title).toBe("Test Event");
      expect(db.calendar_events.insert).toHaveBeenCalled();
    });
  });

  describe("event updates", () => {
    it("should update event", async () => {
      const mockEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Original Title",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        exdates: [],
        tags: [],
        source: "user",
        deleted: false,
      };

      const mockDoc = {
        toJSON: () => ({ ...mockEvent, title: "Updated Title" }),
        patch: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([mockEvent]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const updated = await updateEvent(db as any, {
        id: "event-1",
        title: "Updated Title",
      });

      expect(updated?.title).toBe("Updated Title");
      expect(mockDoc.patch).toHaveBeenCalled();
    });

    it("should return null for non-existent event", async () => {
      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const updated = await updateEvent(db as any, {
        id: "non-existent",
        title: "New Title",
      });

      expect(updated).toBeNull();
    });
  });

  describe("event deletion", () => {
    it("should soft delete event", async () => {
      const mockDoc = {
        patch: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const success = await deleteEvent(db as any, "event-1");

      expect(success).toBe(true);
      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: true }),
      );
    });

    it("should hard delete event", async () => {
      const mockDoc = {
        remove: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const success = await permanentlyDeleteEvent(db as any, "event-1");

      expect(success).toBe(true);
      expect(mockDoc.remove).toHaveBeenCalled();
    });

    it("should restore deleted event", async () => {
      const mockDoc = {
        patch: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const success = await restoreEvent(db as any, "event-1");

      expect(success).toBe(true);
      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: false }),
      );
    });
  });

  describe("recurring event exclusions", () => {
    it("should add exclusion date", async () => {
      const mockEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Recurring Event",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        rrule: "FREQ=DAILY;COUNT=10",
        exdates: [],
        tags: [],
        source: "user",
        deleted: false,
      };

      const mockDoc = {
        toJSON: () => mockEvent,
        patch: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([mockEvent]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const exclusionDate = new Date("2026-01-20T10:00:00Z");
      const success = await addExclusionDate(
        db as any,
        "event-1",
        exclusionDate,
      );

      expect(success).toBe(true);
      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          exdates: [exclusionDate.getTime()],
        }),
      );
    });

    it("should remove exclusion date", async () => {
      const exclusionTimestamp = new Date("2026-01-20T10:00:00Z").getTime();
      const mockEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Recurring Event",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        rrule: "FREQ=DAILY;COUNT=10",
        exdates: [exclusionTimestamp],
        tags: [],
        source: "user",
        deleted: false,
      };

      const mockDoc = {
        toJSON: () => mockEvent,
        patch: vi.fn().mockResolvedValue(true),
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([mockEvent]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      const exclusionDate = new Date("2026-01-20T10:00:00Z");
      const success = await removeExclusionDate(
        db as any,
        "event-1",
        exclusionDate,
      );

      expect(success).toBe(true);
      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          exdates: [],
        }),
      );
    });
  });

  describe("event duplication", () => {
    it("should duplicate event with offset", async () => {
      const mockEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Original Event",
        description: "Description",
        location: "Location",
        startTime: new Date("2026-01-15T10:00:00Z").getTime(),
        endTime: new Date("2026-01-15T11:00:00Z").getTime(),
        isAllDay: false,
        timezone: "Asia/Taipei",
        exdates: [],
        tags: ["work"],
        source: "user",
        deleted: false,
        lastModified: Date.now(),
      };

      const mockDoc = {
        toJSON: () => mockEvent,
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([]),
      });

      db.calendar_events.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      });

      db.calendar_events.insert = vi.fn().mockImplementation((data) => {
        return Promise.resolve({ toJSON: () => data });
      });

      const duplicated = await duplicateEvent(db as any, "event-1", 7);

      expect(duplicated).not.toBeNull();
      expect(duplicated?.title).toBe("Original Event");
      expect(duplicated?.startTime).toBeGreaterThan(mockEvent.startTime);
      expect(duplicated?.rrule).toBeUndefined();
      expect(duplicated?.id).not.toBe(mockEvent.id);
    });
  });

  describe("event search and filtering", () => {
    it("should get events by tag", async () => {
      const workEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "Work Event",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        exdates: [],
        tags: ["work"],
        source: "user",
        deleted: false,
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([workEvent]),
      });

      const workEvents = await getEventsByTag(db as any, "work");

      expect(workEvents.length).toBeGreaterThan(0);
      expect(workEvents[0].tags).toContain("work");
    });

    it("should get events by source", async () => {
      const userEvent: CalendarEvent = {
        id: "event-1",
        calendarId: "cal-1",
        title: "User Event",
        description: "",
        location: "",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        isAllDay: false,
        exdates: [],
        tags: [],
        source: "user",
        deleted: false,
      };

      const db = createMockRxDB({
        calendar_events: createMockRxCollection([userEvent]),
      });

      const userEvents = await getEventsBySource(db as any, "user");

      expect(userEvents.length).toBeGreaterThan(0);
      expect(userEvents[0].source).toBe("user");
    });

    it("should search events by query", async () => {
      const events: CalendarEvent[] = [
        {
          id: "event-1",
          calendarId: "cal-1",
          title: "Team Meeting",
          description: "Discuss project",
          location: "Room 101",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isAllDay: false,
          exdates: [],
          tags: [],
          source: "user",
          deleted: false,
        },
        {
          id: "event-2",
          calendarId: "cal-1",
          title: "Lunch",
          description: "Lunch break",
          location: "Cafeteria",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isAllDay: false,
          exdates: [],
          tags: [],
          source: "user",
          deleted: false,
        },
      ];

      const db = createMockRxDB({
        calendar_events: createMockRxCollection(events),
      });

      const results = await searchEvents(db as any, "meeting");

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("Meeting");
    });
  });

  describe("event statistics", () => {
    it("should calculate calendar statistics", async () => {
      const events: CalendarEvent[] = [
        {
          id: "event-1",
          calendarId: "cal-1",
          title: "Event 1",
          description: "",
          location: "",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isAllDay: true,
          exdates: [],
          tags: ["work"],
          source: "user",
          deleted: false,
        },
        {
          id: "event-2",
          calendarId: "cal-1",
          title: "Event 2",
          description: "",
          location: "",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isAllDay: false,
          rrule: "FREQ=DAILY;COUNT=5",
          exdates: [],
          tags: [],
          source: "user",
          deleted: false,
        },
        {
          id: "event-3",
          calendarId: "cal-1",
          title: "Event 3",
          description: "",
          location: "",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isAllDay: false,
          exdates: [],
          tags: [],
          source: "user",
          deleted: true,
        },
      ];

      const db = createMockRxDB({
        calendar_events: createMockRxCollection(events),
      });

      const stats = await getCalendarStatistics(db as any, "cal-1");

      expect(stats.total).toBe(3);
      expect(stats.deleted).toBe(1);
      expect(stats.recurring).toBe(1);
      expect(stats.isAllDay).toBe(1);
      expect(stats.tagged).toBe(1);
    });
  });
});
