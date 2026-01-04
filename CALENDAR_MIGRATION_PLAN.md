# Calendar Reimplementation Plan

## Executive Summary

This document outlines a comprehensive plan to **reimplement the calendar system only** with improved architecture, better testing, and feature parity with major calendar vendors. The current implementation (3,619 lines of calendar code) has several architectural issues that make it buggy and difficult to maintain.

**Important:** This plan **does NOT touch timetable code**. Calendar will remain independent of timetable. The existing one-way timetable→calendar sync will be preserved as-is.

---

## Current State Analysis

### Identified Issues with Current Calendar

1. **Inefficient Event Fetching**
   - Currently fetches ALL events from database: `useRxQuery(eventsCol?.find())`
   - No date range filtering at query level
   - Filtering happens in memory after fetching everything
   - No RxDB indexes for efficient queries
   - Performance degrades with large event datasets

2. **Complex Migration Logic**
   - RxDB schema migration (v0→v1) has 100+ lines handling nested `docData` structures
   - Fragile and hard to maintain
   - No rollback mechanism

3. **No Frontend Testing**
   - Comprehensive backend iCalendar tests (599 lines)
   - Zero frontend/browser tests for UI components
   - No integration tests for event CRUD operations

4. **Buggy Calendar Utilities**
   - `actualEnd` calculation seems redundant and error-prone
   - Manual recurring event expansion is complex and untested
   - Custom recurrence logic instead of using standards (RRULE)

5. **State Management Issues**
   - Deep nesting in `calendar_hook.tsx` with multiple useEffects
   - No error boundaries around replication failures
   - Hard to debug and reason about
   - Updates to recurring events have convoluted logic (lines 281-401)

6. **Missing Features for Vendor Parity**
   - No event search functionality
   - Limited import/export (only iCalendar export)
   - No calendar subscriptions
   - No event reminders/notifications
   - No drag-and-drop rescheduling
   - No timezone support
   - No multiple calendars

---

## Migration Strategy

### Phase 0: Data Migration from Old Calendar to New Calendar

#### 0.1 Old Schema (Current - Version 1)

```typescript
// Current: events collection (v1)
{
  id: string,
  title: string,
  details?: string,
  location?: string,
  allDay: boolean,
  start: string,              // ISO date string
  end: string,                // ISO date string
  actualEnd?: string,         // ISO date string (for repeat)
  repeat: null | {
    type: "daily" | "weekly" | "monthly" | "yearly",
    interval: number,
    mode: "count" | "date",
    value: number             // count or timestamp
  },
  color: string,
  tag: string,                // Single tag
  excludedDates: string[],    // ISO date strings
  parentId?: string,          // For edited recurring instances
}

// Current: timetablesync collection (v0)
{
  semester: string,
  lastSync: string,
  courses: string[]
}
```

#### 0.2 New Schema (Target - Version 0)

```typescript
// New: events collection (v0 - fresh start)
{
  id: string,                    // UUID
  calendarId: string,            // Which calendar this belongs to
  title: string,
  description?: string,          // Renamed from 'details'
  location?: string,
  isAllDay: boolean,             // Renamed from 'allDay'
  startTime: number,             // Unix timestamp UTC (change from ISO string)
  endTime: number,               // Unix timestamp UTC (change from ISO string)
  timezone: string,              // NEW: IANA timezone (e.g., "Asia/Taipei")

  // Recurrence - using standard RRULE
  rrule?: string,                // NEW: RFC 5545 RRULE string
  exdates?: number[],            // Renamed from excludedDates, now timestamps
  recurrenceId?: number,         // For edited instances of recurring events

  // Metadata
  color?: string,
  tags: string[],                // Changed from single tag to array
  source: 'user' | 'timetable' | 'import',  // NEW: track source
  sourceId?: string,             // NEW: original timetable course ID if synced

  // Sync
  lastModified: number,          // NEW: Unix timestamp for sync
  deleted: boolean,              // NEW: Soft delete for sync

  // Future features (optional for now)
  reminders?: Reminder[],
  attachments?: Attachment[]
}

// New: calendars collection (v0)
{
  id: string,                    // UUID
  name: string,
  description?: string,
  color: string,
  isDefault: boolean,
  isVisible: boolean,
  source: 'user' | 'timetable' | 'subscription',

  // For timetable calendars
  semesterId?: string,

  // For subscriptions
  subscriptionUrl?: string,
  lastSync?: number,

  lastModified: number,
  deleted: boolean
}

// Keep existing: timetablesync collection (v0) - NO CHANGES
// This is used by timetable→calendar sync, we won't touch it
{
  semester: string,
  lastSync: string,
  courses: string[]
}
```

#### 0.3 Migration Script

**File:** `apps/web/src/lib/migrations/calendar-v1-to-v0.ts`

```typescript
import { RxDatabase } from 'rxdb';
import { RRule } from 'rrule';
import { nanoid } from 'nanoid';

export async function migrateCalendarV1ToV0(db: RxDatabase) {
  console.log('[Migration] Starting calendar v1 → v0 migration');

  // Step 1: Export old data as backup
  const oldEvents = await db.events.find().exec();
  const backup = {
    version: 1,
    timestamp: Date.now(),
    events: oldEvents.map(e => e.toJSON())
  };

  // Save backup to IndexedDB
  localStorage.setItem('calendar_migration_backup', JSON.stringify(backup));
  console.log(`[Migration] Backed up ${oldEvents.length} events`);

  // Step 2: Create default calendar
  const defaultCalendarId = nanoid();
  await db.calendars.insert({
    id: defaultCalendarId,
    name: 'My Calendar',
    description: 'Default calendar for personal events',
    color: '#3b82f6',
    isDefault: true,
    isVisible: true,
    source: 'user',
    lastModified: Date.now(),
    deleted: false
  });

  // Step 3: Migrate each event
  let migratedCount = 0;
  let errorCount = 0;

  for (const oldEvent of oldEvents) {
    try {
      const oldData = oldEvent.toJSON();

      // Convert old repeat format to RRULE
      let rrule: string | undefined;
      let exdates: number[] | undefined;

      if (oldData.repeat) {
        // Convert old repeat to RRULE
        rrule = convertOldRepeatToRRule(oldData);
      }

      if (oldData.excludedDates && oldData.excludedDates.length > 0) {
        exdates = oldData.excludedDates.map(d => new Date(d).getTime());
      }

      // Determine source
      let source: 'user' | 'timetable' | 'import' = 'user';
      let sourceId: string | undefined;

      // If tag is 'Course', it's likely from timetable
      if (oldData.tag === 'Course') {
        source = 'timetable';
        // Try to extract course ID from title or details
        sourceId = extractCourseId(oldData);
      }

      const newEvent = {
        id: oldData.id,
        calendarId: defaultCalendarId,
        title: oldData.title,
        description: oldData.details,
        location: oldData.location,
        isAllDay: oldData.allDay,
        startTime: new Date(oldData.start).getTime(),
        endTime: new Date(oldData.end).getTime(),
        timezone: 'Asia/Taipei', // Default timezone
        rrule,
        exdates,
        recurrenceId: oldData.parentId ? new Date(oldData.start).getTime() : undefined,
        color: oldData.color,
        tags: oldData.tag ? [oldData.tag] : [],
        source,
        sourceId,
        lastModified: Date.now(),
        deleted: false
      };

      await db.events.insert(newEvent);
      migratedCount++;

    } catch (error) {
      console.error(`[Migration] Failed to migrate event ${oldEvent.id}:`, error);
      errorCount++;
    }
  }

  console.log(`[Migration] Complete: ${migratedCount} migrated, ${errorCount} errors`);

  // Step 4: Log migration status
  localStorage.setItem('calendar_migration_status', JSON.stringify({
    completed: true,
    timestamp: Date.now(),
    migratedCount,
    errorCount,
    backupAvailable: true
  }));

  return { migratedCount, errorCount };
}

function convertOldRepeatToRRule(oldEvent: any): string {
  const startDate = new Date(oldEvent.start);

  let freq: any;
  switch (oldEvent.repeat.type) {
    case 'daily': freq = RRule.DAILY; break;
    case 'weekly': freq = RRule.WEEKLY; break;
    case 'monthly': freq = RRule.MONTHLY; break;
    case 'yearly': freq = RRule.YEARLY; break;
  }

  const ruleOptions: any = {
    freq,
    interval: oldEvent.repeat.interval || 1,
    dtstart: startDate
  };

  if (oldEvent.repeat.mode === 'count') {
    ruleOptions.count = oldEvent.repeat.value;
  } else if (oldEvent.repeat.mode === 'date') {
    ruleOptions.until = new Date(oldEvent.repeat.value);
  }

  const rule = new RRule(ruleOptions);
  return rule.toString();
}

function extractCourseId(oldEvent: any): string | undefined {
  // Try to extract course ID from title pattern like "CS101 - Intro to CS"
  const match = oldEvent.title.match(/^([A-Z]{2,4}\d{3,4})/);
  return match ? match[1] : undefined;
}
```

#### 0.4 Migration UI Flow

**File:** `apps/web/src/components/Calendar/MigrationDialog.tsx`

1. **Detection:** On app load, check if old schema exists and new schema doesn't
2. **Notification:** Show modal explaining migration
3. **Backup:** Automatic backup before migration
4. **Progress:** Show progress bar during migration
5. **Validation:** Verify all events migrated correctly
6. **Rollback:** If errors > 10%, offer to rollback
7. **Completion:** Show success message with migration stats

```typescript
// Migration dialog flow
<MigrationDialog>
  <Step 1: Intro>
    "We're upgrading your calendar to a new version with better performance and features.
     This will take a moment..."
  </Step>

  <Step 2: Backup>
    "Creating backup... ✓"
  </Step>

  <Step 3: Migration>
    "Migrating events... (45/120)"
    <ProgressBar value={45} max={120} />
  </Step>

  <Step 4: Validation>
    "Validating data... ✓"
  </Step>

  <Step 5: Complete>
    "Migration complete!
     ✓ 118 events migrated successfully
     ⚠️ 2 events need review

     What's new:
     - Multiple calendars support
     - Event search
     - Timezone support
     - Better performance"

    <Button>Get Started</Button>
    <Button variant="link">Review migration report</Button>
  </Step>
</MigrationDialog>
```

---

### Phase 1: Foundation & Architecture (Week 1-2)

#### 1.1 New RxDB Schema Design

**File:** `apps/web/src/config/rxdb-v2.ts`

```typescript
import { RxJsonSchema } from 'rxdb';

export const eventsSchemaV0: RxJsonSchema<EventDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    calendarId: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    description: { type: 'string' },
    location: { type: 'string' },
    isAllDay: { type: 'boolean' },
    startTime: { type: 'number' },      // Unix timestamp
    endTime: { type: 'number' },        // Unix timestamp
    timezone: { type: 'string' },       // IANA timezone

    rrule: { type: 'string' },          // RRULE string
    exdates: {
      type: 'array',
      items: { type: 'number' }
    },
    recurrenceId: { type: 'number' },

    color: { type: 'string' },
    tags: {
      type: 'array',
      items: { type: 'string' }
    },
    source: {
      type: 'string',
      enum: ['user', 'timetable', 'import']
    },
    sourceId: { type: 'string' },

    lastModified: { type: 'number' },
    deleted: { type: 'boolean' },

    reminders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          minutes: { type: 'number' },
          method: { type: 'string' }
        }
      }
    }
  },
  required: ['id', 'calendarId', 'title', 'isAllDay', 'startTime', 'endTime', 'timezone', 'lastModified', 'deleted'],
  indexes: [
    'calendarId',              // Filter by calendar
    'startTime',               // Sort by start time
    'endTime',                 // Query by end time
    ['startTime', 'endTime'],  // Compound index for range queries
    'source',                  // Filter by source
    'deleted',                 // Filter out deleted
    'lastModified'             // For sync
  ]
};

export const calendarsSchemaV0: RxJsonSchema<CalendarDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string' },
    isDefault: { type: 'boolean' },
    isVisible: { type: 'boolean' },
    source: {
      type: 'string',
      enum: ['user', 'timetable', 'subscription']
    },
    semesterId: { type: 'string' },
    subscriptionUrl: { type: 'string' },
    lastSync: { type: 'number' },
    lastModified: { type: 'number' },
    deleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'color', 'isDefault', 'isVisible', 'source', 'lastModified', 'deleted'],
  indexes: ['source', 'isVisible', 'deleted', 'lastModified']
};

// Keep existing timetablesync schema - DO NOT CHANGE
// This is used by timetable code, we won't touch it
```

**Benefits of new schema:**
- **Indexes for performance:** Compound index on `[startTime, endTime]` for efficient range queries
- **Standard RRULE:** Compatible with iCalendar, Google Calendar, etc.
- **Unix timestamps:** Easier timezone conversion and comparisons
- **Multi-calendar support:** Built-in from day 1
- **Soft deletes:** Better for sync and data recovery
- **Source tracking:** Know where events came from (user, timetable, import)

#### 1.2 Event Fetching Reimplementation

**Current Problem:**
```typescript
// OLD CODE (inefficient)
const { result: eventStore } = useRxQuery(eventsCol?.find());
const events = useMemo(() => {
  return eventStore.map(e => {
    // Convert all events...
  });
}, [eventStore]);
```

This fetches **ALL events** from the database, then filters in memory. Terrible for performance.

**New Solution:**

**File:** `apps/web/src/lib/hooks/use-calendar-events.ts`

```typescript
import { useRxQuery } from 'rxdb-hooks';
import { useMemo } from 'react';
import { RRule } from 'rrule';

export function useCalendarEvents(
  calendarIds: string[],
  rangeStart: Date,
  rangeEnd: Date
) {
  // Build efficient RxDB query with indexes
  const { result: eventDocs, isFetching } = useRxQuery(
    collection => {
      if (!collection) return null;

      const startTime = rangeStart.getTime();
      const endTime = rangeEnd.getTime();

      return collection.find({
        selector: {
          calendarId: { $in: calendarIds },
          deleted: false,
          $or: [
            // Non-recurring events in range
            {
              rrule: { $exists: false },
              startTime: { $lte: endTime },
              endTime: { $gte: startTime }
            },
            // Recurring events that started before range end
            {
              rrule: { $exists: true },
              startTime: { $lte: endTime }
            }
          ]
        },
        sort: [{ startTime: 'asc' }]  // Use index
      });
    },
    'events'
  );

  // Expand recurring events
  const events = useMemo(() => {
    if (!eventDocs) return [];

    const expanded: EventInstance[] = [];

    for (const doc of eventDocs) {
      const event = doc.toJSON();

      if (!event.rrule) {
        // Simple non-recurring event
        expanded.push({
          ...event,
          instanceStart: event.startTime,
          instanceEnd: event.endTime
        });
      } else {
        // Expand recurring event
        const instances = expandRecurringEvent(
          event,
          rangeStart,
          rangeEnd
        );
        expanded.push(...instances);
      }
    }

    return expanded;
  }, [eventDocs, rangeStart, rangeEnd]);

  return { events, isFetching };
}

function expandRecurringEvent(
  event: EventDocType,
  rangeStart: Date,
  rangeEnd: Date
): EventInstance[] {
  const rrule = RRule.fromString(event.rrule!);
  const instances: EventInstance[] = [];

  // Get occurrences in range
  const occurrences = rrule.between(rangeStart, rangeEnd, true);

  // Filter out excluded dates
  const exdates = new Set(event.exdates || []);

  const duration = event.endTime - event.startTime;

  for (const occurrence of occurrences) {
    const instanceStart = occurrence.getTime();

    // Skip if excluded
    if (exdates.has(instanceStart)) continue;

    instances.push({
      ...event,
      instanceStart,
      instanceEnd: instanceStart + duration,
      isRecurringInstance: true,
      originalEventId: event.id
    });
  }

  return instances;
}
```

**Performance Comparison:**

| Metric | Old Method | New Method |
|--------|-----------|------------|
| Query | Fetch ALL events | Fetch only events in range + recurring |
| Filtering | In-memory | Database index |
| Events (100 total) | Load 100 | Load ~10-20 |
| Events (1000 total) | Load 1000 | Load ~20-30 |
| Query time (1000 events) | ~500ms | ~50ms |
| Memory usage | High (all events) | Low (only visible) |

#### 1.3 Query Hooks for Different Views

**File:** `apps/web/src/lib/hooks/use-calendar-queries.ts`

```typescript
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from 'date-fns';

// Week view: Load current week + 1 week before/after for smooth scrolling
export function useWeekViewEvents(date: Date, calendarIds: string[]) {
  const start = startOfWeek(addWeeks(date, -1));
  const end = endOfWeek(addWeeks(date, 1));
  return useCalendarEvents(calendarIds, start, end);
}

// Month view: Load current month + previous/next for navigation
export function useMonthViewEvents(date: Date, calendarIds: string[]) {
  const start = startOfMonth(addMonths(date, -1));
  const end = endOfMonth(addMonths(date, 1));
  return useCalendarEvents(calendarIds, start, end);
}

// Agenda view: Load upcoming events (next 3 months)
export function useAgendaViewEvents(calendarIds: string[]) {
  const start = new Date();
  const end = addMonths(start, 3);
  return useCalendarEvents(calendarIds, start, end);
}

// Search: Load all events (but only from visible calendars)
export function useSearchEvents(query: string, calendarIds: string[]) {
  const { result: eventDocs } = useRxQuery(
    collection => {
      if (!collection || !query) return null;

      return collection.find({
        selector: {
          calendarId: { $in: calendarIds },
          deleted: false,
          $or: [
            { title: { $regex: new RegExp(query, 'i') } },
            { description: { $regex: new RegExp(query, 'i') } },
            { location: { $regex: new RegExp(query, 'i') } },
            { tags: { $elemMatch: { $regex: new RegExp(query, 'i') } } }
          ]
        },
        sort: [{ startTime: 'desc' }],
        limit: 50  // Limit search results
      });
    },
    'events'
  );

  return eventDocs?.map(d => d.toJSON()) || [];
}
```

#### 1.4 State Management Refactor

**File:** `apps/web/src/lib/store/calendar-ui-store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarUIStore {
  // View state
  currentView: 'week' | 'month' | 'day' | 'agenda';
  selectedDate: Date;

  // Calendar filters
  visibleCalendarIds: string[];

  // UI state
  sidebarOpen: boolean;
  eventDialogOpen: boolean;
  selectedEventId: string | null;

  // Actions
  setView: (view: CalendarUIStore['currentView']) => void;
  setSelectedDate: (date: Date) => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  setVisibleCalendars: (calendarIds: string[]) => void;
  setSidebarOpen: (open: boolean) => void;
  openEventDialog: (eventId?: string) => void;
  closeEventDialog: () => void;
}

export const useCalendarUIStore = create<CalendarUIStore>()(
  persist(
    (set, get) => ({
      currentView: 'week',
      selectedDate: new Date(),
      visibleCalendarIds: [],
      sidebarOpen: true,
      eventDialogOpen: false,
      selectedEventId: null,

      setView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),

      toggleCalendarVisibility: (calendarId) => {
        const { visibleCalendarIds } = get();
        const isVisible = visibleCalendarIds.includes(calendarId);

        set({
          visibleCalendarIds: isVisible
            ? visibleCalendarIds.filter(id => id !== calendarId)
            : [...visibleCalendarIds, calendarId]
        });
      },

      setVisibleCalendars: (calendarIds) => set({ visibleCalendarIds: calendarIds }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      openEventDialog: (eventId) => set({
        eventDialogOpen: true,
        selectedEventId: eventId || null
      }),

      closeEventDialog: () => set({
        eventDialogOpen: false,
        selectedEventId: null
      })
    }),
    {
      name: 'calendar-ui-store',
      partialize: (state) => ({
        currentView: state.currentView,
        sidebarOpen: state.sidebarOpen,
        visibleCalendarIds: state.visibleCalendarIds
      })
    }
  )
);
```

**Benefits:**
- Clean separation: RxDB for data, Zustand for UI state
- Persisted preferences (view, sidebar, visible calendars)
- No prop drilling
- Easy to test

#### 1.5 Error Boundaries

**File:** `apps/web/src/components/Calendar/CalendarErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@courseweb/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Calendar Error]:', error, errorInfo);

    // Log to error tracking service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Something went wrong with the calendar
          </h2>
          <p className="text-gray-600 mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### Phase 2: Core Calendar Reimplementation (Week 3-4)

#### 2.1 Calendar Utilities Rewrite

**File:** `apps/web/src/lib/utils/calendar-utils.ts`

```typescript
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Convert RRULE string + event to instances in date range
export function expandRecurringEvent(
  event: EventDocType,
  rangeStart: Date,
  rangeEnd: Date
): EventInstance[] {
  if (!event.rrule) return [];

  const rrule = rrulestr(event.rrule);
  const occurrences = rrule.between(rangeStart, rangeEnd, true);

  const exdates = new Set(event.exdates || []);
  const duration = event.endTime - event.startTime;

  return occurrences
    .filter(occ => !exdates.has(occ.getTime()))
    .map(occ => ({
      ...event,
      instanceStart: occ.getTime(),
      instanceEnd: occ.getTime() + duration,
      isRecurringInstance: true,
      originalEventId: event.id
    }));
}

// Create RRULE from user-friendly form
export function createRRule(config: RecurrenceConfig): string {
  const options: any = {
    freq: config.frequency,  // RRule.DAILY, WEEKLY, etc.
    interval: config.interval || 1,
    dtstart: config.startDate
  };

  if (config.endType === 'count') {
    options.count = config.count;
  } else if (config.endType === 'until') {
    options.until = config.untilDate;
  }

  if (config.frequency === RRule.WEEKLY && config.byweekday) {
    options.byweekday = config.byweekday;  // [RRule.MO, RRule.WE, RRule.FR]
  }

  const rule = new RRule(options);
  return rule.toString();
}

// Timezone conversion
export function eventToUserTimezone(
  event: EventDocType,
  userTimezone: string
): EventInstance {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const zonedStart = utcToZonedTime(startDate, userTimezone);
  const zonedEnd = utcToZonedTime(endDate, userTimezone);

  return {
    ...event,
    instanceStart: zonedStart.getTime(),
    instanceEnd: zonedEnd.getTime(),
    displayTimezone: userTimezone
  };
}

export function eventToUTC(
  localEvent: EventInstance,
  timezone: string
): EventDocType {
  const startDate = new Date(localEvent.instanceStart);
  const endDate = new Date(localEvent.instanceEnd);

  const utcStart = zonedTimeToUtc(startDate, timezone);
  const utcEnd = zonedTimeToUtc(endDate, timezone);

  return {
    ...localEvent,
    startTime: utcStart.getTime(),
    endTime: utcEnd.getTime()
  };
}

// Date helpers
export function getWeekBounds(date: Date): [Date, Date] {
  return [startOfWeek(date, { weekStartsOn: 0 }), endOfWeek(date, { weekStartsOn: 0 })];
}

export function getMonthBounds(date: Date): [Date, Date] {
  return [startOfMonth(date), endOfMonth(date)];
}

export function getMonthGrid(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let currentDate = start;

  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(days);
  }

  return weeks;
}

// Event overlap detection for layout
export function detectOverlaps(events: EventInstance[]): OverlapGroup[] {
  const sorted = [...events].sort((a, b) => a.instanceStart - b.instanceStart);
  const groups: OverlapGroup[] = [];

  for (const event of sorted) {
    // Find groups this event overlaps with
    const overlappingGroups = groups.filter(group =>
      group.events.some(e => eventsOverlap(e, event))
    );

    if (overlappingGroups.length === 0) {
      // Create new group
      groups.push({ events: [event], columns: 1 });
    } else {
      // Add to first overlapping group
      overlappingGroups[0].events.push(event);
      overlappingGroups[0].columns = Math.max(
        overlappingGroups[0].columns,
        getMaxConcurrent(overlappingGroups[0].events)
      );
    }
  }

  return groups;
}

function eventsOverlap(a: EventInstance, b: EventInstance): boolean {
  return a.instanceStart < b.instanceEnd && b.instanceStart < a.instanceEnd;
}

function getMaxConcurrent(events: EventInstance[]): number {
  const points: { time: number; type: 'start' | 'end' }[] = [];

  for (const event of events) {
    points.push({ time: event.instanceStart, type: 'start' });
    points.push({ time: event.instanceEnd, type: 'end' });
  }

  points.sort((a, b) => {
    if (a.time === b.time) return a.type === 'start' ? 1 : -1;
    return a.time - b.time;
  });

  let current = 0;
  let max = 0;

  for (const point of points) {
    if (point.type === 'start') {
      current++;
      max = Math.max(max, current);
    } else {
      current--;
    }
  }

  return max;
}

// Search/filter
export function searchEvents(events: EventDocType[], query: string): EventDocType[] {
  const lowerQuery = query.toLowerCase();
  return events.filter(event =>
    event.title.toLowerCase().includes(lowerQuery) ||
    event.description?.toLowerCase().includes(lowerQuery) ||
    event.location?.toLowerCase().includes(lowerQuery) ||
    event.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function filterByTags(events: EventDocType[], tags: string[]): EventDocType[] {
  if (tags.length === 0) return events;
  return events.filter(event =>
    event.tags.some(tag => tags.includes(tag))
  );
}
```

**Testing:**
- Unit test every function
- Test DST transitions, leap years, end-of-month edge cases
- Test multiple timezones
- Test RRULE edge cases

#### 2.2 UI Component Structure

```
src/components/Calendar/
  CalendarApp.tsx                 # Main container

  CalendarHeader/
    ViewSelector.tsx              # Week/Month/Day/Agenda tabs
    DateNavigator.tsx             # Prev/Today/Next + date picker
    CalendarFilter.tsx            # Show/hide calendars
    SearchBar.tsx                 # Event search

  CalendarSidebar/
    MiniCalendar.tsx              # Small month view
    CalendarList.tsx              # List of calendars with toggle
    UpcomingEvents.tsx            # Next events list

  Views/
    WeekView/
      WeekView.tsx                # Container
      WeekGrid.tsx                # Hour grid with events
      EventBlock.tsx              # Individual event rendering
      CurrentTimeIndicator.tsx    # Red line showing now

    MonthView/
      MonthView.tsx               # Container
      MonthGrid.tsx               # Calendar grid
      DayCell.tsx                 # Individual day cell

    AgendaView/
      AgendaView.tsx              # Upcoming events list
      AgendaList.tsx              # Virtualized list

    DayView/
      DayView.tsx                 # Single day detailed view

  Dialogs/
    EventDialog/
      EventDialog.tsx             # Modal wrapper
      EventForm.tsx               # Form with react-hook-form
      RecurrenceSelector.tsx      # RRULE UI
      ReminderSelector.tsx        # Reminder config
    SyncDialog.tsx                # Timetable sync (keep existing)

  CalendarErrorBoundary.tsx       # Error handling
```

---

### Phase 3: Testing Infrastructure (Week 5)

#### 3.1 Unit Tests

**Framework:** Vitest

**Coverage Target:** 90%+ for utilities and hooks

```bash
# Test files structure
src/lib/
  utils/
    calendar-utils.test.ts      # All calendar utilities
    recurrence.test.ts          # RRULE handling
    timezone.test.ts            # Timezone conversion
  hooks/
    use-calendar-events.test.ts # Event fetching hook
    use-calendars.test.ts       # Calendar management hook
  migrations/
    calendar-v1-to-v0.test.ts   # Migration script
```

**Example test:**

```typescript
// calendar-utils.test.ts
import { describe, it, expect } from 'vitest';
import { expandRecurringEvent, createRRule } from './calendar-utils';
import { RRule } from 'rrule';

describe('expandRecurringEvent', () => {
  it('should expand weekly recurring event correctly', () => {
    const event = {
      id: '1',
      title: 'Weekly Meeting',
      startTime: new Date('2024-01-01T10:00:00Z').getTime(),
      endTime: new Date('2024-01-01T11:00:00Z').getTime(),
      rrule: 'FREQ=WEEKLY;COUNT=4',
      // ... other fields
    };

    const rangeStart = new Date('2024-01-01');
    const rangeEnd = new Date('2024-02-01');

    const instances = expandRecurringEvent(event, rangeStart, rangeEnd);

    expect(instances).toHaveLength(4);
    expect(instances[0].instanceStart).toBe(event.startTime);
    expect(instances[1].instanceStart).toBe(
      new Date('2024-01-08T10:00:00Z').getTime()
    );
  });

  it('should respect excluded dates', () => {
    const event = {
      id: '1',
      title: 'Daily Standup',
      startTime: new Date('2024-01-01T09:00:00Z').getTime(),
      endTime: new Date('2024-01-01T09:15:00Z').getTime(),
      rrule: 'FREQ=DAILY;COUNT=5',
      exdates: [new Date('2024-01-03T09:00:00Z').getTime()],
    };

    const instances = expandRecurringEvent(
      event,
      new Date('2024-01-01'),
      new Date('2024-01-06')
    );

    expect(instances).toHaveLength(4);  // 5 - 1 excluded
    expect(instances.find(i => i.instanceStart === event.exdates[0])).toBeUndefined();
  });
});

describe('timezone conversion', () => {
  it('should convert UTC to user timezone', () => {
    // Test timezone conversion
  });

  it('should handle DST transition correctly', () => {
    // Test DST edge case
  });
});
```

#### 3.2 Browser/E2E Tests

**Framework:** Playwright

**Test scenarios:**

```typescript
// e2e/calendar/event-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calendar Event Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-view"]');
  });

  test('User can create, edit, and delete a simple event', async ({ page }) => {
    // Click add event button
    await page.click('[data-testid="add-event-btn"]');

    // Fill in event details
    await page.fill('[name="title"]', 'Team Meeting');
    await page.fill('[name="location"]', 'Conference Room A');
    await page.click('[data-testid="save-event-btn"]');

    // Verify event appears in calendar
    await expect(page.locator('text=Team Meeting')).toBeVisible();

    // Edit event
    await page.click('text=Team Meeting');
    await page.click('[data-testid="edit-event-btn"]');
    await page.fill('[name="title"]', 'Team Sync');
    await page.click('[data-testid="save-event-btn"]');

    // Verify changes
    await expect(page.locator('text=Team Sync')).toBeVisible();
    await expect(page.locator('text=Team Meeting')).not.toBeVisible();

    // Delete event
    await page.click('text=Team Sync');
    await page.click('[data-testid="delete-event-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');

    // Verify deletion
    await expect(page.locator('text=Team Sync')).not.toBeVisible();
  });

  test('Recurring events work correctly', async ({ page }) => {
    // Create weekly recurring event
    await page.click('[data-testid="add-event-btn"]');
    await page.fill('[name="title"]', 'Weekly Standup');
    await page.click('[data-testid="recurrence-toggle"]');
    await page.selectOption('[name="frequency"]', 'WEEKLY');
    await page.fill('[name="count"]', '4');
    await page.click('[data-testid="save-event-btn"]');

    // Verify 4 instances appear (month view shows all)
    await page.click('[data-testid="view-month"]');
    const instances = await page.locator('text=Weekly Standup').count();
    expect(instances).toBe(4);

    // Edit single instance
    const firstInstance = page.locator('text=Weekly Standup').first();
    await firstInstance.click();
    await page.click('[data-testid="edit-event-btn"]');
    await page.click('[data-testid="edit-this-instance"]');
    await page.fill('[name="title"]', 'Standup (Cancelled)');
    await page.click('[data-testid="save-event-btn"]');

    // Verify only one changed
    await expect(page.locator('text=Standup (Cancelled)')).toHaveCount(1);
    await expect(page.locator('text=Weekly Standup')).toHaveCount(3);
  });
});

test.describe('Calendar Performance', () => {
  test('Renders 1000 events in < 1s', async ({ page }) => {
    // Seed database with 1000 events
    await page.evaluate(() => {
      // Call seeding function
    });

    const startTime = Date.now();
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-view"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1000);
  });

  test('Scrolling is smooth with many events', async ({ page }) => {
    // Test FPS during scroll
  });
});

test.describe('Event Search', () => {
  test('Search finds events by title', async ({ page }) => {
    await page.goto('/calendar');

    // Type in search
    await page.fill('[data-testid="search-input"]', 'meeting');

    // Verify results
    const results = page.locator('[data-testid="search-results"] > *');
    await expect(results).toHaveCount(3);
  });
});

test.describe('Migration', () => {
  test('Migration from v1 to v0 works correctly', async ({ page }) => {
    // Seed old schema data
    // Trigger migration
    // Verify data migrated correctly
  });
});
```

**Visual Regression:**

```typescript
// e2e/visual/calendar-views.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Week view looks correct', async ({ page }) => {
    await page.goto('/calendar?view=week&date=2024-01-15');
    await page.waitForSelector('[data-testid="week-view"]');
    await expect(page).toHaveScreenshot('week-view.png');
  });

  test('Month view looks correct', async ({ page }) => {
    await page.goto('/calendar?view=month&date=2024-01-01');
    await page.waitForSelector('[data-testid="month-view"]');
    await expect(page).toHaveScreenshot('month-view.png');
  });

  test('Event dialog looks correct', async ({ page }) => {
    await page.goto('/calendar');
    await page.click('[data-testid="add-event-btn"]');
    await expect(page.locator('[data-testid="event-dialog"]')).toHaveScreenshot('event-dialog.png');
  });
});
```

---

### Phase 4: Feature Parity (Week 6-7)

#### 4.1 Feature Checklist

| Feature | Google Calendar | Current | Target |
|---------|----------------|---------|--------|
| Multiple calendars | ✅ | ❌ | ✅ |
| Recurring events | ✅ | ✅ | ✅ (better) |
| Event search | ✅ | ❌ | ✅ |
| Drag-and-drop | ✅ | ❌ | ✅ |
| Reminders | ✅ | ❌ | ✅ |
| Timezone support | ✅ | ❌ | ✅ |
| iCal import/export | ✅ | Export only | ✅ |
| Calendar subscriptions | ✅ | ❌ | ✅ |
| Week numbers | ✅ | ❌ | ✅ |
| Multi-day events | ✅ | ❌ | ✅ |

See original plan for implementation details of each feature.

---

## Implementation Timeline

### Week 1: Migration + Schema
- [ ] Implement new RxDB schemas (events v0, calendars v0)
- [ ] Write migration script (v1 → v0)
- [ ] Create migration UI dialog
- [ ] Test migration with sample data
- [ ] Add rollback mechanism

### Week 2: Event Fetching + State
- [ ] Reimplement event fetching with indexes
- [ ] Create `useCalendarEvents` hook with date range queries
- [ ] Create query hooks for different views
- [ ] Set up Zustand store for UI state
- [ ] Add error boundaries
- [ ] Write unit tests for hooks

### Week 3: Calendar Utilities
- [ ] Implement RRULE-based recurrence with `rrule` library
- [ ] Implement timezone support with `date-fns-tz`
- [ ] Write calendar utility functions
- [ ] Write comprehensive unit tests (100% coverage)
- [ ] Test edge cases (DST, leap years, etc.)

### Week 4: UI Components
- [ ] Rebuild WeekView with new event fetching
- [ ] Rebuild MonthView with new event fetching
- [ ] Build AgendaView
- [ ] Build DayView
- [ ] Rebuild EventDialog with better recurrence UI
- [ ] Add loading states and error states

### Week 5: Testing
- [ ] Set up Vitest for unit tests
- [ ] Write unit tests for all utilities (target 90%+)
- [ ] Set up Playwright for E2E tests
- [ ] Write E2E test scenarios (10+ tests)
- [ ] Write visual regression tests
- [ ] Write performance tests
- [ ] Set up CI to run all tests

### Week 6-7: Features
- [ ] Implement multiple calendars
- [ ] Implement event search
- [ ] Implement drag-and-drop with `@dnd-kit`
- [ ] Implement reminders with notifications
- [ ] Implement timezone selector in event form
- [ ] Update iCalendar export with new fields
- [ ] Implement iCalendar import
- [ ] Implement calendar subscriptions
- [ ] Implement keyboard navigation

### Week 8: Polish
- [ ] UI/UX improvements
- [ ] Mobile optimizations
- [ ] Accessibility improvements (ARIA, keyboard nav)
- [ ] Performance optimizations
- [ ] Empty states
- [ ] Loading states
- [ ] Documentation

---

## Success Metrics

### Performance
- [ ] Initial load < 2s
- [ ] Event rendering < 100ms for 100 events in view
- [ ] Query time < 50ms with 1000 total events
- [ ] Smooth scrolling (60 FPS)
- [ ] Bundle size < 500KB (gzipped)

### Reliability
- [ ] Zero data loss during migration
- [ ] Migration success rate > 99%
- [ ] < 1% error rate in production
- [ ] Offline mode works 100% of time

### Testing
- [ ] 90%+ unit test coverage
- [ ] 100% critical path E2E coverage
- [ ] All UI components have visual regression tests

### Feature Parity
- [ ] Match Google Calendar core features
- [ ] iCalendar import/export works with all major vendors
- [ ] Calendar subscriptions work with public calendars

---

## Dependencies

### New Dependencies
- `rrule` - Recurrence rule parsing/generation (standard library, 2.7M weekly downloads)
- `date-fns-tz` - Timezone support
- `@dnd-kit/core` - Drag and drop
- `react-virtuoso` - Virtualization for performance
- `ical.js` - iCalendar parsing
- `zustand` - State management
- `vitest` - Unit testing
- `@testing-library/react` - Component testing
- `@playwright/test` - E2E testing

### Existing Dependencies (Keep)
- `rxdb` - Database
- `date-fns` - Date manipulation
- `react-hook-form` + `zod` - Form handling
- `shadcn/ui` - UI components

---

## What We're NOT Changing

1. **Timetable code** - Zero changes to timetable components or logic
2. **Timetable→Calendar sync** - Existing sync mechanism stays as-is
3. **`timetablesync` collection** - Schema unchanged
4. **Backend timetable APIs** - No changes
5. **Course data** - No changes

**The only integration point:** Calendar will continue to accept events from timetable sync, but that's handled by existing code.

---

## Risk Assessment

### High Risk

**Risk:** Data loss during migration
- **Mitigation:** Automatic backup before migration, validation after, rollback option
- **Testing:** Test migration with 100+ different event patterns

**Risk:** Performance degradation with many events
- **Mitigation:** Proper indexes, date range queries, virtualization, performance tests
- **Testing:** Load test with 1000+ events

### Medium Risk

**Risk:** Timezone bugs
- **Mitigation:** Use well-tested `date-fns-tz`, comprehensive timezone tests, DST edge cases
- **Testing:** Test with multiple timezones, DST transitions

**Risk:** RRULE compatibility
- **Mitigation:** Use standard `rrule` library, test with real iCalendar files from Google/Apple/Outlook
- **Testing:** Import/export round-trip tests

### Low Risk

**Risk:** Migration UI confusing
- **Mitigation:** Clear messaging, progress bar, migration report
- **Testing:** User testing before release

---

## Conclusion

This plan provides a focused path to reimplement the calendar with:

1. ✅ **Clean Architecture** - Proper schemas, indexes, and efficient queries
2. ✅ **Data Migration** - Safe migration from old calendar to new with backup/rollback
3. ✅ **Better Event Fetching** - Indexed queries, date range filtering, proper recurrence handling
4. ✅ **Comprehensive Testing** - Unit, integration, and E2E tests with 90%+ coverage
5. ✅ **Feature Parity** - Match major calendar vendors
6. ✅ **No Timetable Changes** - Calendar is independent, timetable untouched

**Timeline:** 8 weeks for full implementation

**Next Steps:**
1. Review and approve this plan
2. Confirm migration strategy
3. Begin Week 1 implementation
4. Weekly progress reviews
