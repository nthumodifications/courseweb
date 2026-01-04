import { vi } from "vitest";
import type { CalendarEvent } from "@/config/rxdb-calendar-v2";

/**
 * Mock RxDB document
 */
export function createMockRxDocument<T>(data: T) {
  return {
    toJSON: () => data,
    get: (key: keyof T) => data[key],
    ...data,
  };
}

/**
 * Mock RxDB collection
 */
export function createMockRxCollection<T>(documents: T[] = []) {
  const docs = documents.map((doc) => createMockRxDocument(doc));

  return {
    find: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(docs),
      $: {
        subscribe: vi.fn((callback: (docs: any[]) => void) => {
          callback(docs);
          return { unsubscribe: vi.fn() };
        }),
      },
    }),
    findOne: vi.fn((id: string) => ({
      exec: vi
        .fn()
        .mockResolvedValue(docs.find((doc: any) => doc.id === id) || null),
      $: {
        subscribe: vi.fn((callback: (doc: any) => void) => {
          const doc = docs.find((d: any) => d.id === id);
          callback(doc || null);
          return { unsubscribe: vi.fn() };
        }),
      },
    })),
    insert: vi.fn().mockImplementation((data: T) => {
      const newDoc = createMockRxDocument(data);
      docs.push(newDoc);
      return Promise.resolve(newDoc);
    }),
    bulkInsert: vi.fn().mockImplementation((dataArray: T[]) => {
      const newDocs = dataArray.map((data) => createMockRxDocument(data));
      docs.push(...newDocs);
      return Promise.resolve({ success: newDocs, error: [] });
    }),
    upsert: vi.fn().mockImplementation((data: T) => {
      const newDoc = createMockRxDocument(data);
      return Promise.resolve(newDoc);
    }),
  };
}

/**
 * Mock RxDB database
 */
export function createMockRxDB(collections: Record<string, any> = {}) {
  return {
    ...collections,
    addCollections: vi.fn(),
    remove: vi.fn(),
  };
}

/**
 * Create mock calendar event
 */
export function createMockCalendarEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  const baseEvent: CalendarEvent = {
    id: `event-${Date.now()}`,
    calendarId: "cal-1",
    title: "Test Event",
    description: "",
    location: "",
    startTime: new Date("2026-01-10T10:00:00Z").getTime(),
    endTime: new Date("2026-01-10T11:00:00Z").getTime(),
    allDay: false,
    rrule: undefined,
    exdates: [],
    tags: [],
    source: "user",
    metadata: {},
    deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { ...baseEvent, ...overrides };
}

/**
 * Create mock recurring calendar event
 */
export function createMockRecurringEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return createMockCalendarEvent({
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10",
    ...overrides,
  });
}

/**
 * Mock useRxDB hook
 */
export function mockUseRxDB(db: any) {
  return vi.fn(() => db);
}

/**
 * Mock useRxCollection hook
 */
export function mockUseRxCollection(collection: any) {
  return vi.fn(() => collection);
}

/**
 * Mock useRxQuery hook
 */
export function mockUseRxQuery(result: any, isFetching = false) {
  return vi.fn(() => ({ result, isFetching }));
}
