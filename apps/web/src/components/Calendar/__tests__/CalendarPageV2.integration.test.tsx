/**
 * Integration tests for CalendarPageV2
 *
 * These tests use real RxDB with schema validation to catch runtime errors
 * that mocked tests miss.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createRxDatabase, addRxPlugin, RxDatabase } from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { Provider as RxDBProvider } from "rxdb-hooks";
import CalendarPageV2 from "../CalendarPageV2";
import {
  calendarEventsSchemaV0,
  calendarsSchemaV0,
} from "@/config/rxdb-calendar-v2";

// Enable dev mode for better error messages
if (process.env.NODE_ENV !== "production") {
  addRxPlugin(RxDBDevModePlugin);
}

describe("CalendarPageV2 Integration Tests", () => {
  let db: RxDatabase;

  beforeEach(async () => {
    // Create a real RxDB instance with memory storage
    db = await createRxDatabase({
      name: "test-calendar-db-" + Date.now(),
      storage: getRxStorageMemory(),
    });

    // Add collections with real schemas (this will catch schema validation errors)
    await db.addCollections({
      calendar_events: {
        schema: calendarEventsSchemaV0,
      },
      calendars: {
        schema: calendarsSchemaV0,
      },
    });
  });

  afterEach(async () => {
    if (db) {
      await db.destroy();
    }
  });

  describe("Default Calendar Creation", () => {
    it("should create default calendar with all required fields", async () => {
      const TestComponent = () => (
        <RxDBProvider db={db}>
          <CalendarPageV2 />
        </RxDBProvider>
      );

      render(<TestComponent />);

      // Wait for database initialization
      await waitFor(
        () => {
          expect(
            screen.queryByText("Initializing database..."),
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Check that default calendar was created with all required fields
      const calendars = await db.calendars.find().exec();
      expect(calendars.length).toBe(1);

      const calendar = calendars[0].toJSON();
      expect(calendar.id).toBeDefined();
      expect(calendar.name).toBe("My Calendar");
      expect(calendar.source).toBe("user");
      expect(calendar.isDeleted).toBe(false);
      expect(calendar.lastModified).toBeGreaterThan(0);
      expect(calendar.isDefault).toBe(true);
      expect(calendar.isVisible).toBe(true);
    });

    it("should use correct collection name (calendars not calendar_calendars)", async () => {
      // This test verifies that the collection is accessed correctly
      expect(db.calendars).toBeDefined();
      expect((db as any).calendar_calendars).toBeUndefined();

      // Verify we can insert using the correct collection name
      const calendar = await db.calendars.insert({
        id: "test-calendar",
        name: "Test Calendar",
        description: "Test",
        color: "#000000",
        isDefault: false,
        isVisible: true,
        source: "user",
        isDeleted: false,
        lastModified: Date.now(),
      });

      expect(calendar).toBeDefined();
    });

    it("should validate source enum values", async () => {
      // This should work - valid source
      await expect(
        db.calendars.insert({
          id: "valid-calendar",
          name: "Valid",
          description: "",
          color: "#000000",
          isDefault: false,
          isVisible: true,
          source: "user",
          isDeleted: false,
          lastModified: Date.now(),
        }),
      ).resolves.toBeDefined();

      // This should fail - invalid source
      await expect(
        db.calendars.insert({
          id: "invalid-calendar",
          name: "Invalid",
          description: "",
          color: "#000000",
          isDefault: false,
          isVisible: true,
          source: "invalid_source" as any,
          isDeleted: false,
          lastModified: Date.now(),
        }),
      ).rejects.toThrow();
    });
  });

  describe("Calendar Event Creation", () => {
    beforeEach(async () => {
      // Create a test calendar first
      await db.calendars.insert({
        id: "test-cal",
        name: "Test Calendar",
        description: "Test",
        color: "#3b82f6",
        isDefault: true,
        isVisible: true,
        source: "user",
        isDeleted: false,
        lastModified: Date.now(),
      });
    });

    it("should create event with all required fields", async () => {
      const event = await db.calendar_events.insert({
        id: "event-1",
        calendarId: "test-cal",
        title: "Test Event",
        description: "",
        location: "",
        isAllDay: false,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        timezone: "Asia/Taipei",
        exdates: [],
        tags: [],
        source: "user",
        isDeleted: false,
        lastModified: Date.now(),
      });

      expect(event).toBeDefined();
      const doc = await db.calendar_events.findOne("event-1").exec();
      expect(doc).toBeDefined();
    });

    it("should validate source enum for events", async () => {
      // Valid sources
      for (const source of ["user", "timetable", "import"]) {
        await expect(
          db.calendar_events.insert({
            id: `event-${source}`,
            calendarId: "test-cal",
            title: "Test Event",
            description: "",
            location: "",
            isAllDay: false,
            startTime: Date.now(),
            endTime: Date.now() + 3600000,
            timezone: "Asia/Taipei",
            exdates: [],
            tags: [],
            source: source as "user" | "timetable" | "import",
            isDeleted: false,
            lastModified: Date.now(),
          }),
        ).resolves.toBeDefined();
      }

      // Invalid source
      await expect(
        db.calendar_events.insert({
          id: "event-invalid",
          calendarId: "test-cal",
          title: "Test Event",
          description: "",
          location: "",
          isAllDay: false,
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          timezone: "Asia/Taipei",
          exdates: [],
          tags: [],
          source: "invalid" as any,
          isDeleted: false,
          lastModified: Date.now(),
        }),
      ).rejects.toThrow();
    });

    it("should require all mandatory fields", async () => {
      // Missing required fields should fail
      await expect(
        db.calendar_events.insert({
          id: "incomplete-event",
          calendarId: "test-cal",
          title: "Test Event",
          // Missing: isAllDay, startTime, endTime, timezone, deleted, lastModified
        } as any),
      ).rejects.toThrow();
    });

    it("should validate timestamp ranges", async () => {
      // Valid timestamp
      await expect(
        db.calendar_events.insert({
          id: "valid-time",
          calendarId: "test-cal",
          title: "Test Event",
          description: "",
          location: "",
          isAllDay: false,
          startTime: 1600000000000,
          endTime: 1600003600000,
          timezone: "Asia/Taipei",
          exdates: [],
          tags: [],
          source: "user",
          isDeleted: false,
          lastModified: Date.now(),
        }),
      ).resolves.toBeDefined();

      // Invalid timestamp (negative)
      await expect(
        db.calendar_events.insert({
          id: "invalid-time",
          calendarId: "test-cal",
          title: "Test Event",
          description: "",
          location: "",
          isAllDay: false,
          startTime: -1,
          endTime: 1600003600000,
          timezone: "Asia/Taipei",
          exdates: [],
          tags: [],
          source: "user",
          isDeleted: false,
          lastModified: Date.now(),
        }),
      ).rejects.toThrow();
    });
  });

  describe("Schema Validation", () => {
    it("should have correct collection names", () => {
      expect(db.calendar_events).toBeDefined();
      expect(db.calendars).toBeDefined();
      expect((db as any).calendar_calendars).toBeUndefined();
    });

    it("should enforce schema version", () => {
      expect(db.calendar_events.schema.version).toBe(1);
      expect(db.calendars.schema.version).toBe(1);
    });

    it("should have correct primary keys", () => {
      expect(db.calendar_events.schema.primaryPath).toBe("id");
      expect(db.calendars.schema.primaryPath).toBe("id");
    });
  });
});
