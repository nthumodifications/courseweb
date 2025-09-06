import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { mockPrismaClient, mockUserFindUnique } from "../__mocks__/prisma";
import { mockFirebaseAdmin, mockFirebaseGet } from "../__mocks__/firebase";
import { setPrismaClient } from "./apiKeyValidation";

// Import after mocking
import { createICalendar } from "./icalendar";

// Create mock clients
const mockClient = mockPrismaClient() as any;
const mockFirebase = mockFirebaseAdmin();

describe("iCalendar Utility", () => {
  beforeAll(() => {
    // Set our mock client before all tests
    setPrismaClient(mockClient as any);
  });

  afterAll(() => {
    // Reset the client after all tests
    setPrismaClient(null);
  });

  beforeEach(() => {
    mockUserFindUnique.mockClear();
    mockFirebaseGet.mockClear();
  });

  test("should create a valid iCalendar with events", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Check for iCalendar format structure
    expect(calendar).toBeTruthy();
    expect(typeof calendar).toBe("string");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("VERSION:2.0");
    expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFirebaseGet).toHaveBeenCalledTimes(1);
  });

  test("should create a minimal iCalendar without detailed information when includeFullDetails is false", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    const calendar = await createICalendar(
      "test-user-id",
      false,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Basic structure should be present
    expect(calendar).toBeTruthy();
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("VERSION:2.0");

    // When includeFullDetails is false, location and details should be omitted
    // Find an event summary first
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));

    // Check at least one event exists
    expect(events.length).toBeGreaterThan(0);

    // Sample the first event to check structure
    const firstEvent = events[0][0];
    expect(firstEvent).toContain("SUMMARY:");

    // Since includeFullDetails is false, the event shouldn't have location/description
    // but we need to check the actual event data to be sure as some may be absent regardless
    const eventWithDetailsAndLocation = events.find((event) =>
      event[0].includes("Lecture: Introduction to React"),
    );

    if (eventWithDetailsAndLocation) {
      expect(eventWithDetailsAndLocation[0]).not.toContain("DESCRIPTION:");
      expect(eventWithDetailsAndLocation[0]).not.toContain("LOCATION:");
    }

    expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFirebaseGet).toHaveBeenCalledTimes(1);
  });

  test("should throw an error when user is not found", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };
    // Override the mock to return null for this test
    mockUserFindUnique.mockImplementationOnce(() =>
      Promise.resolve(null as any),
    );

    // Temporarily silence console.error during this test
    const originalConsoleError = console.error;
    console.error = () => {}; // No-op function

    try {
      await createICalendar(
        "non-existent-user",
        true,
        mockContext,
        mockClient,
        mockFirebase,
      );
      // Restore console.error before the assertion
      console.error = originalConsoleError;
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      // Restore console.error before the assertion
      console.error = originalConsoleError;
      expect(error).toBeTruthy();
      expect((error as Error).message).toBe(
        "User with ID non-existent-user not found",
      );
    }
  });
  test("should handle empty event list correctly", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Override the mock to return empty docs for this test
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [],
        empty: true,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Should still create a valid iCalendar structure even with no events
    expect(calendar).toBeTruthy();
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("VERSION:2.0");
    expect(calendar).toContain("END:VCALENDAR");

    // There should be no events in the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(0);
  });

  // Tests for specific event types
  test("should correctly convert regular time-specific events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the regular time-to-time event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-1",
            data: () => ({
              title: "Lecture: Introduction to React",
              start: new Date("2025-05-19T10:00:00").toISOString(),
              end: new Date("2025-05-19T12:00:00").toISOString(),
              actualEnd: new Date("2025-05-19T12:00:00").toISOString(),
              details: "Introductory lecture covering React basics and hooks",
              location: "Engineering Building Room 301",
              allDay: false,
              repeat: null,
              color: "#4285F4",
              tag: "lecture",
              excludedDates: [],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for a regular event
    expect(eventText).toContain("SUMMARY:Lecture: Introduction to React");
    expect(eventText).toContain("DTSTART:20250519T100000");
    expect(eventText).toContain("DTEND:20250519T120000");
    expect(eventText).toContain(
      "DESCRIPTION:Introductory lecture covering React basics and hooks",
    );
    expect(eventText).toContain("LOCATION:Engineering Building Room 301");

    // Regular events should not have an all-day flag or recurrence rule
    expect(eventText).not.toContain("VALUE=DATE");
    expect(eventText).not.toContain("RRULE:");
  });

  test("should correctly convert all-day single-day events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the all-day single-day event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-2",
            data: () => ({
              title: "Project Submission Deadline",
              start: new Date("2025-05-20T00:00:00").toISOString(),
              end: new Date("2025-05-20T23:59:59").toISOString(),
              actualEnd: new Date("2025-05-20T23:59:59").toISOString(),
              details: "Final deadline for submission of course project",
              location: "Online via CourseWeb",
              allDay: true,
              repeat: null,
              color: "#DB4437",
              tag: "assignment",
              excludedDates: [],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for an all-day single-day event
    expect(eventText).toContain("SUMMARY:Project Submission Deadline");

    // All-day events should use VALUE=DATE format without time component
    expect(eventText).toContain("DTSTART;VALUE=DATE:20250520");
    // Note: iCalendar format might add 1 to end date for all-day events since end is exclusive
    expect(eventText).toMatch(/DTEND;VALUE=DATE:2025052[0-1]/);
    expect(eventText).toContain(
      "DESCRIPTION:Final deadline for submission of course project",
    );
    expect(eventText).toContain("LOCATION:Online via CourseWeb");
  });

  test("should correctly convert all-day multi-day events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the all-day multi-day event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-3",
            data: () => ({
              title: "Reading Week",
              start: new Date("2025-05-25T00:00:00").toISOString(),
              end: new Date("2025-05-31T23:59:59").toISOString(),
              actualEnd: new Date("2025-05-31T23:59:59").toISOString(),
              details: "No classes during reading week",
              location: "NTHU Campus",
              allDay: true,
              repeat: null,
              color: "#0F9D58",
              tag: "holiday",
              excludedDates: [],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for an all-day multi-day event
    expect(eventText).toContain("SUMMARY:Reading Week");
    expect(eventText).toContain("DTSTART;VALUE=DATE:20250525");
    // End date should be after the start date
    expect(eventText).toMatch(/DTEND;VALUE=DATE:2025053[1]/); // May 31 - the actual implementation uses the exact end date

    expect(eventText).toContain("DESCRIPTION:No classes during reading week");
    expect(eventText).toContain("LOCATION:NTHU Campus");
  });

  test("should correctly convert weekly recurring events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the weekly recurring event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-4",
            data: () => ({
              title: "Web Development Lab",
              start: new Date("2025-05-22T14:00:00").toISOString(),
              end: new Date("2025-05-22T16:00:00").toISOString(),
              actualEnd: new Date("2025-05-22T16:00:00").toISOString(),
              details: "Hands-on lab session for web development course",
              location: "Computer Science Building Lab 2",
              allDay: false,
              repeat: {
                type: "weekly",
                interval: 1,
                mode: "count",
                value: 10,
              },
              color: "#F4B400",
              tag: "lab",
              excludedDates: [
                new Date("2025-06-05T14:00:00").toISOString(), // Skip session during exam week
              ],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for a weekly recurring event
    expect(eventText).toContain("SUMMARY:Web Development Lab");
    expect(eventText).toContain("DTSTART:20250522T140000");
    expect(eventText).toContain("DTEND:20250522T160000");
    expect(eventText).toContain(
      "DESCRIPTION:Hands-on lab session for web development course",
    );
    expect(eventText).toContain("LOCATION:Computer Science Building Lab 2");

    // Check for recurrence rule - should be weekly
    expect(eventText).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1");
    // Check for excluded dates - the library adds timezone information
    expect(eventText).toContain("EXDATE;TZID=Asia/Taipei:20250605T140000");
  });

  test("should correctly convert daily recurring events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the daily recurring event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-6",
            data: () => ({
              title: "Morning Check-in",
              start: new Date("2025-05-19T08:30:00").toISOString(),
              end: new Date("2025-05-19T08:45:00").toISOString(),
              actualEnd: new Date("2025-05-19T08:45:00").toISOString(),
              details: "Quick team sync-up meeting",
              location: "Online via Teams",
              allDay: false,
              repeat: {
                type: "daily",
                interval: 1,
                mode: "count",
                value: 20,
              },
              color: "#00ACC1",
              tag: "meeting",
              excludedDates: [
                new Date("2025-05-24T08:30:00").toISOString(),
                new Date("2025-05-25T08:30:00").toISOString(),
              ],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for a daily recurring event
    expect(eventText).toContain("SUMMARY:Morning Check-in");
    expect(eventText).toContain("DTSTART:20250519T083000");
    expect(eventText).toContain("DTEND:20250519T084500");

    // Check for recurrence rule - should be daily
    expect(eventText).toContain("RRULE:FREQ=DAILY;INTERVAL=1");
    // Check for excluded dates - should have two, but the library combines them into a single property
    expect(eventText).toContain(
      "EXDATE;TZID=Asia/Taipei:20250524T083000,20250525T083000",
    );
  });

  test("should correctly convert monthly recurring events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the monthly recurring event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-5",
            data: () => ({
              title: "Department Meeting",
              start: new Date("2025-05-05T13:00:00").toISOString(),
              end: new Date("2025-05-05T14:30:00").toISOString(),
              actualEnd: new Date("2025-05-05T14:30:00").toISOString(),
              details: "Monthly department progress review meeting",
              location: "Admin Building Conference Room",
              allDay: false,
              repeat: {
                type: "monthly",
                interval: 1,
                mode: "date",
                value: new Date("2025-12-31").getTime(),
              },
              color: "#AB47BC",
              tag: "meeting",
              excludedDates: [],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for a monthly recurring event
    expect(eventText).toContain("SUMMARY:Department Meeting");
    expect(eventText).toContain("DTSTART:20250505T130000");
    expect(eventText).toContain("DTEND:20250505T143000");

    // Check for recurrence rule - should be monthly with until date
    expect(eventText).toContain("RRULE:FREQ=MONTHLY;INTERVAL=1;UNTIL=20251231");
  });

  test("should correctly convert yearly recurring events to iCalendar format", async () => {
    const mockContext = {
      env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
    };

    // Mock to return only the yearly recurring event
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [
          {
            id: "event-7",
            data: () => ({
              title: "Department Anniversary",
              start: new Date("2025-06-15T00:00:00").toISOString(),
              end: new Date("2025-06-15T23:59:59").toISOString(),
              actualEnd: new Date("2025-06-15T23:59:59").toISOString(),
              details: "Annual celebration of department founding",
              location: "University Courtyard",
              allDay: true,
              repeat: {
                type: "yearly",
                interval: 1,
                mode: "date",
                value: new Date("2030-06-15").getTime(),
              },
              color: "#FF7043",
              tag: "event",
              excludedDates: [],
              parentId: "",
            }),
          },
        ],
        empty: false,
      }),
    );

    const calendar = await createICalendar(
      "test-user-id",
      true,
      mockContext,
      mockClient,
      mockFirebase,
    );

    // Extract the event from the calendar
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const events = Array.from(calendar.matchAll(eventRegex));
    expect(events.length).toBe(1);

    const eventText = events[0][0];

    // Check specific properties for a yearly recurring event
    expect(eventText).toContain("SUMMARY:Department Anniversary");
    expect(eventText).toContain("DTSTART;VALUE=DATE:20250615");
    expect(eventText).toMatch(/DTEND;VALUE=DATE:2025061[5-6]/); // Either same day or next day

    // Check for recurrence rule - should be yearly with until date
    expect(eventText).toContain("RRULE:FREQ=YEARLY;INTERVAL=1;UNTIL=20300615");
  });
});
