/**
 * Tests for useCalendarEvents hook
 *
 * Validates:
 * - Date range queries with compound indexes
 * - Recurring event expansion using RRULE
 * - EXDATE handling (excluded dates)
 * - Event filtering by calendar IDs
 * - Deleted event filtering
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCalendarEvents } from "../use-calendar-events";
import {
  createMockRxCollection,
  createMockCalendarEvent,
  createMockRecurringEvent,
} from "@/test/mocks/rxdb";
import { addWeeks, addDays } from "date-fns";

// Mock rxdb-hooks
vi.mock("rxdb-hooks", () => ({
  useRxCollection: vi.fn(),
  useRxQuery: vi.fn(),
}));

import { useRxCollection, useRxQuery } from "rxdb-hooks";

describe("useCalendarEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic event fetching", () => {
    it("should fetch events within date range", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const events = [
        createMockCalendarEvent({
          id: "event-1",
          calendarId: "cal-1",
          title: "Event 1",
          startTime: new Date("2026-01-12T10:00:00Z").getTime(),
          endTime: new Date("2026-01-12T11:00:00Z").getTime(),
        }),
        createMockCalendarEvent({
          id: "event-2",
          calendarId: "cal-1",
          title: "Event 2",
          startTime: new Date("2026-01-15T14:00:00Z").getTime(),
          endTime: new Date("2026-01-15T15:00:00Z").getTime(),
        }),
      ];

      const collection = createMockRxCollection(events);
      const mockDocs = events.map((e) => ({ toJSON: () => e }));

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
        expect(result.current.events[0].title).toBe("Event 1");
        expect(result.current.events[1].title).toBe("Event 2");
        expect(result.current.isFetching).toBe(false);
      });
    });

    it("should filter events by multiple calendar IDs", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const events = [
        createMockCalendarEvent({
          id: "event-1",
          calendarId: "cal-1",
          title: "Calendar 1 Event",
        }),
        createMockCalendarEvent({
          id: "event-2",
          calendarId: "cal-2",
          title: "Calendar 2 Event",
        }),
        createMockCalendarEvent({
          id: "event-3",
          calendarId: "cal-3",
          title: "Calendar 3 Event",
        }),
      ];

      const collection = createMockRxCollection(events);
      const filteredEvents = events.filter((e) =>
        ["cal-1", "cal-2"].includes(e.calendarId),
      );
      const mockDocs = filteredEvents.map((e) => ({ toJSON: () => e }));

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1", "cal-2"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
        expect(
          result.current.events.every((e) => e.calendarId !== "cal-3"),
        ).toBe(true);
      });
    });

    it("should exclude deleted events by default", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const events = [
        createMockCalendarEvent({
          id: "event-1",
          title: "Active Event",
          deleted: false,
        }),
        createMockCalendarEvent({
          id: "event-2",
          title: "Deleted Event",
          deleted: true,
        }),
      ];

      const collection = createMockRxCollection(events);
      const activeEvents = events.filter((e) => !e.deleted);
      const mockDocs = activeEvents.map((e) => ({ toJSON: () => e }));

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
          includeDeleted: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].deleted).toBe(false);
      });
    });

    it("should include deleted events when requested", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const events = [
        createMockCalendarEvent({
          id: "event-1",
          title: "Active Event",
          deleted: false,
        }),
        createMockCalendarEvent({
          id: "event-2",
          title: "Deleted Event",
          deleted: true,
        }),
      ];

      const collection = createMockRxCollection(events);
      const mockDocs = events.map((e) => ({ toJSON: () => e }));

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
          includeDeleted: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });
    });
  });

  describe("recurring event expansion", () => {
    it("should expand weekly recurring events", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z"); // Saturday
      const rangeEnd = new Date("2026-01-24T23:59:59Z"); // Two weeks later

      // Weekly event every Monday, Wednesday, Friday for 10 occurrences
      const recurringEvent = createMockRecurringEvent({
        id: "recurring-1",
        title: "Weekly Meeting",
        startTime: new Date("2026-01-12T10:00:00Z").getTime(), // Monday
        endTime: new Date("2026-01-12T11:00:00Z").getTime(),
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10",
      });

      const collection = createMockRxCollection([recurringEvent]);
      const mockDocs = [{ toJSON: () => recurringEvent }];

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        // Should have instances for Mon/Wed/Fri in the two-week range
        // Week 1: Mon 12th, Wed 14th, Fri 16th
        // Week 2: Mon 19th, Wed 21st, Fri 23rd
        expect(result.current.events.length).toBeGreaterThanOrEqual(6);
        expect(result.current.events.every((e) => e.isRecurringInstance)).toBe(
          true,
        );
        expect(
          result.current.events.every(
            (e) => e.originalEventId === "recurring-1",
          ),
        ).toBe(true);
      });
    });

    it("should respect EXDATE (excluded dates) in recurring events", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const excludedDate = new Date("2026-01-14T10:00:00Z").getTime(); // Wed

      const recurringEvent = createMockRecurringEvent({
        id: "recurring-1",
        title: "Daily Meeting",
        startTime: new Date("2026-01-12T10:00:00Z").getTime(), // Monday
        endTime: new Date("2026-01-12T11:00:00Z").getTime(),
        rrule: "FREQ=DAILY;COUNT=7",
        exdates: [excludedDate], // Exclude Wednesday
      });

      const collection = createMockRxCollection([recurringEvent]);
      const mockDocs = [{ toJSON: () => recurringEvent }];

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        // Should not include the excluded date
        const hasExcludedDate = result.current.events.some(
          (e) => e.instanceStart === excludedDate,
        );
        expect(hasExcludedDate).toBe(false);
      });
    });

    it("should calculate correct instance duration for recurring events", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const duration = 2 * 60 * 60 * 1000; // 2 hours
      const recurringEvent = createMockRecurringEvent({
        id: "recurring-1",
        title: "2-Hour Meeting",
        startTime: new Date("2026-01-12T10:00:00Z").getTime(),
        endTime: new Date("2026-01-12T12:00:00Z").getTime(),
        rrule: "FREQ=DAILY;COUNT=5",
      });

      const collection = createMockRxCollection([recurringEvent]);
      const mockDocs = [{ toJSON: () => recurringEvent }];

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        // Each instance should maintain the 2-hour duration
        result.current.events.forEach((event) => {
          const instanceDuration = event.instanceEnd - event.instanceStart;
          expect(instanceDuration).toBe(duration);
        });
      });
    });
  });

  describe("event sorting", () => {
    it("should sort events by instance start time", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const events = [
        createMockCalendarEvent({
          id: "event-3",
          title: "Latest Event",
          startTime: new Date("2026-01-15T14:00:00Z").getTime(),
          endTime: new Date("2026-01-15T15:00:00Z").getTime(),
        }),
        createMockCalendarEvent({
          id: "event-1",
          title: "Earliest Event",
          startTime: new Date("2026-01-11T09:00:00Z").getTime(),
          endTime: new Date("2026-01-11T10:00:00Z").getTime(),
        }),
        createMockCalendarEvent({
          id: "event-2",
          title: "Middle Event",
          startTime: new Date("2026-01-13T12:00:00Z").getTime(),
          endTime: new Date("2026-01-13T13:00:00Z").getTime(),
        }),
      ];

      const collection = createMockRxCollection(events);
      const mockDocs = events.map((e) => ({ toJSON: () => e }));

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
        expect(result.current.events[0].title).toBe("Earliest Event");
        expect(result.current.events[1].title).toBe("Middle Event");
        expect(result.current.events[2].title).toBe("Latest Event");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty calendar IDs array", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const collection = createMockRxCollection([]);

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: [],
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: [],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(0);
      });
    });

    it("should handle null collection", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      vi.mocked(useRxCollection).mockReturnValue(null as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: null,
        isFetching: false,
      } as any);

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(0);
      });
    });

    it("should handle invalid RRULE gracefully", async () => {
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-17T23:59:59Z");

      const invalidRecurringEvent = createMockCalendarEvent({
        id: "invalid-rrule",
        title: "Invalid RRULE Event",
        rrule: "INVALID RRULE STRING",
      });

      const collection = createMockRxCollection([invalidRecurringEvent]);
      const mockDocs = [{ toJSON: () => invalidRecurringEvent }];

      vi.mocked(useRxCollection).mockReturnValue(collection as any);
      vi.mocked(useRxQuery).mockReturnValue({
        result: mockDocs,
        isFetching: false,
      } as any);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useCalendarEvents({
          calendarIds: ["cal-1"],
          rangeStart,
          rangeEnd,
        }),
      );

      await waitFor(() => {
        // Should return empty array for invalid RRULE
        expect(result.current.events).toHaveLength(0);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
