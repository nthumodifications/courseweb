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
import ical from "ical-generator";
import { createICalendar } from "./icalendar";

const trackedFirebase = (docs: unknown[], whereCalls: unknown[][]) => ({
  adminFirestore: {
    collection: () => ({
      doc: () => ({
        collection: () => {
          const query = {
            where: (...args: unknown[]) => {
              whereCalls.push(args);
              return query;
            },
            orderBy: () => query,
            limit: () => query,
            get: async () => ({ docs }),
          };
          return query;
        },
      }),
    }),
  },
});

const documentFor = (data: Record<string, unknown>) => ({
  id: String(data.id ?? "fixed-event"),
  data: () => data,
});

const weeklyDocument = (
  id: string,
  title: string,
  start: string,
  end: string,
  actualEnd: string,
  value: string,
) =>
  documentFor({
    id,
    title,
    start,
    end,
    actualEnd,
    allDay: false,
    repeat: {
      type: "weekly",
      interval: 1,
      mode: "date",
      value: new Date(value).getTime(),
    },
    excludedDates: [],
  });

const parseIcalUtc = (value: string) =>
  new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`,
  );

const formatIcalUtc = (date: Date) =>
  `${date.getUTCFullYear().toString().padStart(4, "0")}${(date.getUTCMonth() + 1).toString().padStart(2, "0")}${date.getUTCDate().toString().padStart(2, "0")}T${date.getUTCHours().toString().padStart(2, "0")}${date.getUTCMinutes().toString().padStart(2, "0")}${date.getUTCSeconds().toString().padStart(2, "0")}Z`;

const taipeiWeekdayAndTime = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${values.weekday} ${values.hour}:${values.minute}`;
};

const assertWeeklyUtcSeries = ({
  eventText,
  expectedDtstart,
  expectedUntil,
  expectedUtcByDay,
  expectedUtcOccurrences,
  expectedTaipeiOccurrences,
  expectedNextUtcOccurrence,
}: {
  eventText: string;
  expectedDtstart: string;
  expectedUntil: string;
  expectedUtcByDay: string;
  expectedUtcOccurrences: string[];
  expectedTaipeiOccurrences: string[];
  expectedNextUtcOccurrence: string;
}) => {
  expect(eventText).toContain(`DTSTART:${expectedDtstart}`);

  const rule = eventText.match(/^RRULE:([^\r\n]+)$/m)?.[1];
  expect(rule).toBeDefined();
  const fields = Object.fromEntries(
    rule!.split(";").map((field) => field.split("=", 2)),
  );
  expect(fields.FREQ).toBe("WEEKLY");
  expect(fields.INTERVAL).toBe("1");
  expect(fields.UNTIL).toBe(expectedUntil);
  if (fields.BYDAY) {
    expect(fields.BYDAY).toBe(expectedUtcByDay);
  }

  const until = parseIcalUtc(expectedUntil);
  const occurrences: string[] = [];
  for (
    let occurrence = parseIcalUtc(expectedDtstart);
    occurrence <= until;
    occurrence = new Date(occurrence.getTime() + 7 * 24 * 60 * 60 * 1000)
  ) {
    occurrences.push(formatIcalUtc(occurrence));
  }
  expect(occurrences).toEqual(expectedUtcOccurrences);
  const nextOccurrence = new Date(
    parseIcalUtc(expectedUtcOccurrences.at(-1)!).getTime() +
      7 * 24 * 60 * 60 * 1000,
  );
  expect(formatIcalUtc(nextOccurrence)).toBe(expectedNextUtcOccurrence);
  expect(nextOccurrence.getTime()).toBeGreaterThan(until.getTime());
  expect(
    expectedUtcOccurrences.map((occurrence) =>
      taipeiWeekdayAndTime(parseIcalUtc(occurrence)),
    ),
  ).toEqual(expectedTaipeiOccurrences);
};

// Create mock clients
const mockClient = mockPrismaClient() as any;
const mockFirebase = mockFirebaseAdmin();

const mockContext = {
  env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
};

const createTestCalendar = (includeFullDetails: boolean) =>
  createICalendar(
    "test-user-id",
    includeFullDetails,
    mockContext,
    mockClient,
    mockFirebase,
  );

const createTestEvent = async (includeFullDetails = true) => {
  const calendar = await createTestCalendar(includeFullDetails);
  const events = Array.from(
    calendar.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),
  );
  expect(events).toHaveLength(1);
  return events[0]![0];
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  details: string;
  location: string;
  allDay: boolean;
  repeat: unknown;
  color: string;
  tag: string;
  excludedDates: readonly string[];
};

const calendarEvent = (
  id: string,
  title: string,
  start: string,
  end: string,
  details: string,
  location: string,
  allDay: boolean,
  repeat: unknown,
  color: string,
  tag: string,
  excludedDates: readonly string[],
): CalendarEvent => ({
  id,
  title,
  start,
  end,
  details,
  location,
  allDay,
  repeat,
  color,
  tag,
  excludedDates,
});

const calendarEventResponse = (event: CalendarEvent) => ({
  docs: [
    documentFor({
      ...event,
      actualEnd: event.end,
      parentId: "",
    }),
  ],
  empty: false,
});

const eventCase = (
  name: string,
  event: CalendarEvent,
  expectedContains: readonly string[],
  expectedNotContains: readonly string[] = [],
) => ({ name, event, expectedContains, expectedNotContains });

const calendarEventCases = [
  eventCase(
    "should correctly convert regular time-specific events to iCalendar format",
    calendarEvent(
      "event-1",
      "Lecture: Introduction to React",
      new Date("2025-05-19T10:00:00+08:00").toISOString(),
      new Date("2025-05-19T12:00:00+08:00").toISOString(),
      "Introductory lecture covering React basics and hooks",
      "Engineering Building Room 301",
      false,
      null,
      "#4285F4",
      "lecture",
      [],
    ),
    [
      "SUMMARY:Lecture: Introduction to React",
      "DTSTART:20250519T020000Z",
      "DTEND:20250519T040000Z",
      "DESCRIPTION:Introductory lecture covering React basics and hooks",
      "LOCATION:Engineering Building Room 301",
    ],
    ["VALUE=DATE", "RRULE:"],
  ),
  eventCase(
    "should correctly convert all-day single-day events to iCalendar format",
    calendarEvent(
      "event-2",
      "Project Submission Deadline",
      new Date("2025-05-20T00:00:00+08:00").toISOString(),
      new Date("2025-05-20T23:59:59+08:00").toISOString(),
      "Final deadline for submission of course project",
      "Online via CourseWeb",
      true,
      null,
      "#DB4437",
      "assignment",
      [],
    ),
    [
      "SUMMARY:Project Submission Deadline",
      "DTSTART;VALUE=DATE:20250520",
      "DTEND;VALUE=DATE:20250521",
      "DESCRIPTION:Final deadline for submission of course project",
      "LOCATION:Online via CourseWeb",
    ],
  ),
  eventCase(
    "should correctly convert all-day multi-day events to iCalendar format",
    calendarEvent(
      "event-3",
      "Reading Week",
      new Date("2025-05-25T00:00:00+08:00").toISOString(),
      new Date("2025-05-31T23:59:59+08:00").toISOString(),
      "No classes during reading week",
      "NTHU Campus",
      true,
      null,
      "#0F9D58",
      "holiday",
      [],
    ),
    [
      "SUMMARY:Reading Week",
      "DTSTART;VALUE=DATE:20250525",
      "DTEND;VALUE=DATE:20250601",
      "DESCRIPTION:No classes during reading week",
      "LOCATION:NTHU Campus",
    ],
  ),
  eventCase(
    "should correctly convert weekly recurring events to iCalendar format",
    calendarEvent(
      "event-4",
      "Web Development Lab",
      new Date("2025-05-22T14:00:00+08:00").toISOString(),
      new Date("2025-05-22T16:00:00+08:00").toISOString(),
      "Hands-on lab session for web development course",
      "Computer Science Building Lab 2",
      false,
      { type: "weekly", interval: 1, mode: "count", value: 10 },
      "#F4B400",
      "lab",
      [new Date("2025-06-05T14:00:00+08:00").toISOString()],
    ),
    [
      "SUMMARY:Web Development Lab",
      "DTSTART:20250522T060000Z",
      "DTEND:20250522T080000Z",
      "DESCRIPTION:Hands-on lab session for web development course",
      "LOCATION:Computer Science Building Lab 2",
      "RRULE:FREQ=WEEKLY;COUNT=10;INTERVAL=1",
      "EXDATE:20250605T060000Z",
    ],
  ),
  eventCase(
    "should correctly convert daily recurring events to iCalendar format",
    calendarEvent(
      "event-6",
      "Morning Check-in",
      new Date("2025-05-19T08:30:00+08:00").toISOString(),
      new Date("2025-05-19T08:45:00+08:00").toISOString(),
      "Quick team sync-up meeting",
      "Online via Teams",
      false,
      { type: "daily", interval: 1, mode: "count", value: 20 },
      "#00ACC1",
      "meeting",
      [
        new Date("2025-05-24T08:30:00+08:00").toISOString(),
        new Date("2025-05-25T08:30:00+08:00").toISOString(),
      ],
    ),
    [
      "SUMMARY:Morning Check-in",
      "DTSTART:20250519T003000Z",
      "DTEND:20250519T004500Z",
      "RRULE:FREQ=DAILY;COUNT=20;INTERVAL=1",
      "EXDATE:20250524T003000Z,20250525T003000Z",
    ],
  ),
  eventCase(
    "should correctly convert monthly recurring events to iCalendar format",
    calendarEvent(
      "event-5",
      "Department Meeting",
      new Date("2025-05-05T13:00:00+08:00").toISOString(),
      new Date("2025-05-05T14:30:00+08:00").toISOString(),
      "Monthly department progress review meeting",
      "Admin Building Conference Room",
      false,
      {
        type: "monthly",
        interval: 1,
        mode: "date",
        value: new Date("2025-12-31T00:00:00+08:00").getTime(),
      },
      "#AB47BC",
      "meeting",
      [],
    ),
    [
      "SUMMARY:Department Meeting",
      "DTSTART:20250505T050000Z",
      "DTEND:20250505T063000Z",
      "RRULE:FREQ=MONTHLY;INTERVAL=1;UNTIL=20251231T155959Z",
    ],
  ),
  eventCase(
    "should correctly convert yearly recurring events to iCalendar format",
    calendarEvent(
      "event-7",
      "Department Anniversary",
      new Date("2025-06-15T00:00:00+08:00").toISOString(),
      new Date("2025-06-15T23:59:59+08:00").toISOString(),
      "Annual celebration of department founding",
      "University Courtyard",
      true,
      {
        type: "yearly",
        interval: 1,
        mode: "date",
        value: new Date("2030-06-15T00:00:00+08:00").getTime(),
      },
      "#FF7043",
      "event",
      [new Date("2026-06-15T00:00:00+08:00").toISOString()],
    ),
    [
      "SUMMARY:Department Anniversary",
      "DTSTART;VALUE=DATE:20250615",
      "DTEND;VALUE=DATE:20250616",
      "RRULE:FREQ=YEARLY;UNTIL=20300615;INTERVAL=1",
      "EXDATE;VALUE=DATE:20260615",
    ],
  ),
] as const;

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
    const calendar = await createTestCalendar(true);

    // Check for iCalendar format structure
    expect(calendar).toBeTruthy();
    expect(typeof calendar).toBe("string");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("VERSION:2.0");
    expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFirebaseGet).toHaveBeenCalledTimes(1);
  });

  test("should create a minimal iCalendar without detailed information when includeFullDetails is false", async () => {
    const calendar = await createTestCalendar(false);

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
    // Override the mock to return empty docs for this test
    mockFirebaseGet.mockImplementationOnce(() =>
      Promise.resolve({
        docs: [],
        empty: true,
      }),
    );

    const calendar = await createTestCalendar(true);

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
  test.each(calendarEventCases)(
    "$name",
    async ({ event, expectedContains, expectedNotContains }) => {
      mockFirebaseGet.mockImplementationOnce(() =>
        Promise.resolve(calendarEventResponse(event)),
      );

      const eventText = await createTestEvent();

      expectedContains.forEach((value) => expect(eventText).toContain(value));
      expectedNotContains.forEach((value) =>
        expect(eventText).not.toContain(value),
      );
    },
  );

  test("proves HEAD-generated UIDs were not stable between exports", () => {
    const createHeadStyleUid = () => {
      const calendar = ical({
        name: "test",
        prodId: { company: "NTHUMods", product: "Calendar" },
      });
      calendar.createEvent({
        start: new Date("2026-09-10T01:00:00.000Z"),
        end: new Date("2026-09-10T02:00:00.000Z"),
        summary: "same event",
      });
      return calendar.toString().match(/UID:([^\r\n]+)/)?.[1];
    };

    const firstUid = createHeadStyleUid();
    const secondUid = createHeadStyleUid();

    expect(firstUid).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondUid).toMatch(/^[0-9a-f-]{36}$/);
    expect(firstUid).not.toBe(secondUid);
  });

  test("emits COUNT rather than treating a count as an UNTIL timestamp", async () => {
    const whereCalls: unknown[][] = [];
    const firebase = trackedFirebase(
      [
        documentFor({
          id: "count-event",
          title: "Counted event",
          start: "2026-09-10T01:00:00.000Z",
          end: "2026-09-10T02:00:00.000Z",
          actualEnd: "2026-09-19T02:00:00.000Z",
          allDay: false,
          repeat: {
            type: "daily",
            interval: 1,
            mode: "count",
            value: 10,
          },
          excludedDates: [],
        }),
      ],
      whereCalls,
    );

    const calendar = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      firebase,
    );

    const eventText = Array.from(
      calendar.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),
    )[0][0];
    expect(eventText).toContain("RRULE:FREQ=DAILY;COUNT=10;INTERVAL=1");
    expect(eventText).not.toContain("UNTIL=");
    expect(whereCalls[1]?.[0]).toBe("actualEnd");
  });

  test("queries and exports a repeat whose root is past but actualEnd is future", async () => {
    const whereCalls: unknown[][] = [];
    const firebase = trackedFirebase(
      [
        documentFor({
          id: "long-running-event",
          title: "Long-running event",
          start: "2020-01-01T01:00:00.000Z",
          end: "2020-01-01T02:00:00.000Z",
          actualEnd: "2099-12-31T02:00:00.000Z",
          allDay: false,
          repeat: {
            type: "daily",
            interval: 1,
            mode: "date",
            value: 4102358400000,
          },
          excludedDates: [],
        }),
      ],
      whereCalls,
    );

    const calendar = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      firebase,
    );

    expect(calendar).toContain("SUMMARY:Long-running event");
    expect(whereCalls[1]?.[0]).toBe("actualEnd");
    expect(whereCalls[1]?.[1]).toBe(">=");
  });

  test("uses stable IDs, UTC fields, RFC escaping, and folded lines", async () => {
    const title = "課程安排，討論；".repeat(20);
    const whereCalls: unknown[][] = [];
    const firebase = trackedFirebase(
      [
        documentFor({
          id: "stable-event",
          title,
          start: "2026-09-10T01:00:00.000Z",
          end: "2026-09-10T02:30:00.000Z",
          actualEnd: "2026-09-10T02:30:00.000Z",
          allDay: false,
          repeat: null,
          details: "details, with; punctuation\\and a newline\ncontinued",
          location: "Room, 101; East",
        }),
      ],
      whereCalls,
    );
    const fixedNow = new Date("2026-09-01T00:00:00.000Z");

    const first = await createICalendar(
      "test-user-id",
      true,
      undefined,
      mockClient,
      firebase,
      fixedNow,
    );
    const second = await createICalendar(
      "test-user-id",
      true,
      undefined,
      mockClient,
      firebase,
      fixedNow,
    );
    const firstEvent = Array.from(
      first.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),
    )[0]?.[0];
    const secondEvent = Array.from(
      second.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),
    )[0]?.[0];

    expect(firstEvent).toBeDefined();
    expect(secondEvent).toBeDefined();
    expect(firstEvent).toContain("UID:stable-event");
    expect(secondEvent).toContain("UID:stable-event");
    expect(firstEvent).toContain("DTSTART:20260910T010000Z");
    expect(firstEvent).toContain("DTEND:20260910T023000Z");
    expect(firstEvent).toContain("SUMMARY:課程安排");
    expect(firstEvent).not.toContain("TZID=Asia/Taipei");
    expect(firstEvent).toContain("DESCRIPTION:details\\, with\\; punctuation");
    expect(firstEvent).toContain("LOCATION:Room\\, 101\\; East");
    expect(firstEvent).not.toContain("EXDATE");

    for (const line of first.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    const unfolded = first
      .split("\r\n")
      .reduce<string[]>((lines, line) => {
        if (line.startsWith(" ")) {
          lines[lines.length - 1] += line.slice(1);
        } else {
          lines.push(line);
        }
        return lines;
      }, [])
      .join("\r\n");
    expect(unfolded).toContain(`SUMMARY:${title}`);
    expect(first).toMatch(/SUMMARY:[^\r\n]{1,74}\r\n /);
    expect(first).toContain("DTSTAMP:");
    expect(first).toMatch(/\r\nEND:VCALENDAR$/);
    expect(whereCalls[0]).toEqual(["start", "<=", "2027-02-28T00:00:00.000Z"]);
    expect(whereCalls[1]).toEqual(["actualEnd", ">=", fixedNow.toISOString()]);
  });

  test("matches a complete RFC-correct timetable feed golden", async () => {
    const fixedNow = new Date("2026-09-01T00:00:00.000Z");
    const whereCalls: unknown[][] = [];
    const firebase = trackedFirebase(
      [
        documentFor({
          id: "weekly-class",
          title: "週一課程",
          start: "2026-09-07T01:00:00.000Z",
          end: "2026-09-07T03:00:00.000Z",
          actualEnd: "2026-09-28T03:00:00.000Z",
          allDay: false,
          repeat: {
            type: "weekly",
            interval: 1,
            mode: "count",
            value: 4,
          },
          excludedDates: ["2026-09-14T01:00:00.000Z"],
          details: "教室 101",
          location: "工程館",
        }),
        documentFor({
          id: "campus-holiday",
          title: "校慶",
          start: "2026-09-20T16:00:00.000Z",
          end: "2026-09-21T15:59:59.000Z",
          actualEnd: "2026-09-21T15:59:59.000Z",
          allDay: true,
          repeat: null,
          excludedDates: [],
          details: "不上課",
          location: "清華大學",
        }),
      ],
      whereCalls,
    );

    const feed = await createICalendar(
      "test-user-id",
      true,
      undefined,
      mockClient,
      firebase,
      fixedNow,
    );

    const expected =
      "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//NTHUMods//Calendar//EN\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "METHOD:PUBLISH\r\n" +
      "NAME:Test User's Calendar\r\n" +
      "X-WR-CALNAME:Test User's Calendar\r\n" +
      "REFRESH-INTERVAL;VALUE=DURATION:PT5M\r\n" +
      "X-PUBLISHED-TTL:PT5M\r\n" +
      "BEGIN:VEVENT\r\n" +
      "UID:weekly-class\r\n" +
      "SEQUENCE:0\r\n" +
      "DTSTAMP:20260901T000000Z\r\n" +
      "DTSTART:20260907T010000Z\r\n" +
      "DTEND:20260907T030000Z\r\n" +
      "RRULE:FREQ=WEEKLY;COUNT=4;INTERVAL=1\r\n" +
      "EXDATE:20260914T010000Z\r\n" +
      "SUMMARY:週一課程\r\n" +
      "LOCATION:工程館\r\n" +
      "DESCRIPTION:教室 101\r\n" +
      "END:VEVENT\r\n" +
      "BEGIN:VEVENT\r\n" +
      "UID:campus-holiday\r\n" +
      "SEQUENCE:0\r\n" +
      "DTSTAMP:20260901T000000Z\r\n" +
      "DTSTART;VALUE=DATE:20260921\r\n" +
      "DTEND;VALUE=DATE:20260922\r\n" +
      "X-MICROSOFT-CDO-ALLDAYEVENT:TRUE\r\n" +
      "X-MICROSOFT-MSNCALENDAR-ALLDAYEVENT:TRUE\r\n" +
      "SUMMARY:校慶\r\n" +
      "LOCATION:清華大學\r\n" +
      "DESCRIPTION:不上課\r\n" +
      "END:VEVENT\r\n" +
      "END:VCALENDAR";

    expect(feed).toBe(expected);
  });

  test("keeps all calendar properties before the first VEVENT", async () => {
    const feed = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      trackedFirebase([], []),
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(feed).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NTHUMods//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "NAME:Test User's Calendar",
        "X-WR-CALNAME:Test User's Calendar",
        "REFRESH-INTERVAL;VALUE=DURATION:PT5M",
        "X-PUBLISHED-TTL:PT5M",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
  });

  test("returns a valid empty calendar when the event collection is empty", async () => {
    const feed = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      trackedFirebase([], []),
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(feed).toContain("BEGIN:VCALENDAR\r\n");
    expect(feed).toContain("METHOD:PUBLISH\r\n");
    expect(feed).not.toContain("BEGIN:VEVENT");
    expect(feed.endsWith("END:VCALENDAR")).toBe(true);
  });

  test("expands weekly UTC rules on the correct Taipei weekday around 08:00", async () => {
    const firebase = trackedFirebase(
      [
        weeklyDocument(
          "monday-0700",
          "Monday 07:00",
          "2026-09-06T23:00:00.000Z",
          "2026-09-07T00:00:00.000Z",
          "2026-09-28T00:00:00.000Z",
          "2026-09-28T07:00:00+08:00",
        ),
        weeklyDocument(
          "monday-0800",
          "Monday 08:00",
          "2026-09-07T00:00:00.000Z",
          "2026-09-07T01:00:00.000Z",
          "2026-09-28T01:00:00.000Z",
          "2026-09-28T08:00:00+08:00",
        ),
        weeklyDocument(
          "monday-0030",
          "Monday 00:30",
          "2026-09-06T16:30:00.000Z",
          "2026-09-06T17:30:00.000Z",
          "2026-09-27T17:30:00.000Z",
          "2026-09-28T00:30:00+08:00",
        ),
      ],
      [],
    );

    const feed = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      firebase,
      new Date("2026-09-01T00:00:00.000Z"),
    );
    const events = Array.from(feed.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g));
    expect(events).toHaveLength(3);

    const eventFor = (summary: string) =>
      events.find((event) => event[0].includes(`SUMMARY:${summary}`))?.[0] ??
      "";

    const weeklyAssertions: Array<Parameters<typeof assertWeeklyUtcSeries>[0]> =
      [
        {
          eventText: eventFor("Monday 07:00"),
          expectedDtstart: "20260906T230000Z",
          expectedUntil: "20260928T155959Z",
          expectedUtcByDay: "SU",
          expectedUtcOccurrences: [
            "20260906T230000Z",
            "20260913T230000Z",
            "20260920T230000Z",
            "20260927T230000Z",
          ],
          expectedTaipeiOccurrences: [
            "Monday 07:00",
            "Monday 07:00",
            "Monday 07:00",
            "Monday 07:00",
          ],
          expectedNextUtcOccurrence: "20261004T230000Z",
        },
        {
          eventText: eventFor("Monday 08:00"),
          expectedDtstart: "20260907T000000Z",
          expectedUntil: "20260928T155959Z",
          expectedUtcByDay: "MO",
          expectedUtcOccurrences: [
            "20260907T000000Z",
            "20260914T000000Z",
            "20260921T000000Z",
            "20260928T000000Z",
          ],
          expectedTaipeiOccurrences: [
            "Monday 08:00",
            "Monday 08:00",
            "Monday 08:00",
            "Monday 08:00",
          ],
          expectedNextUtcOccurrence: "20261005T000000Z",
        },
        {
          eventText: eventFor("Monday 00:30"),
          expectedDtstart: "20260906T163000Z",
          expectedUntil: "20260928T155959Z",
          expectedUtcByDay: "SU",
          expectedUtcOccurrences: [
            "20260906T163000Z",
            "20260913T163000Z",
            "20260920T163000Z",
            "20260927T163000Z",
          ],
          expectedTaipeiOccurrences: [
            "Monday 00:30",
            "Monday 00:30",
            "Monday 00:30",
            "Monday 00:30",
          ],
          expectedNextUtcOccurrence: "20261004T163000Z",
        },
      ];
    for (const weeklyAssertion of weeklyAssertions) {
      assertWeeklyUtcSeries(weeklyAssertion);
    }
  });

  test("writes an early Taipei weekly EXDATE as its UTC occurrence instant", async () => {
    const firebase = trackedFirebase(
      [
        documentFor({
          id: "excluded-early-monday",
          title: "Excluded Monday 07:00",
          start: "2026-09-06T23:00:00.000Z",
          end: "2026-09-07T00:00:00.000Z",
          actualEnd: "2026-09-28T00:00:00.000Z",
          allDay: false,
          repeat: {
            type: "weekly",
            interval: 1,
            mode: "date",
            value: new Date("2026-09-28T07:00:00+08:00").getTime(),
          },
          excludedDates: ["2026-09-14T07:00:00+08:00"],
        }),
      ],
      [],
    );

    const feed = await createICalendar(
      "test-user-id",
      false,
      undefined,
      mockClient,
      firebase,
      new Date("2026-09-01T00:00:00.000Z"),
    );
    const eventText = Array.from(
      feed.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g),
    )[0]?.[0];

    expect(eventText).toContain("DTSTART:20260906T230000Z");
    expect(eventText).toContain("EXDATE:20260913T230000Z");
  });
});
