# Calendar Suite Reimplementation Plan

## Executive Summary

This document outlines a comprehensive plan to reimplement the calendar suite with improved architecture, better testing, and feature parity with major calendar vendors. The current implementation (3,619 lines of calendar code + 1,933 lines of timetable code) has several architectural issues that make it buggy and difficult to maintain.

## Current State Analysis

### Identified Issues

1. **Mixed State Management**
   - Calendar uses RxDB (IndexedDB)
   - Timetable uses localStorage
   - Creates complex syncing logic and potential data inconsistencies

2. **One-Way Sync**
   - Timetable → Calendar works
   - Calendar changes don't reflect back to timetable
   - No way to detect conflicts or divergence

3. **Complex Migration Logic**
   - RxDB schema migration (v0→v1) has 100+ lines handling nested `docData` structures
   - Fragile and hard to maintain

4. **No Frontend Testing**
   - Comprehensive backend iCalendar tests (599 lines)
   - Zero frontend/browser tests for UI components
   - No integration tests for sync mechanisms

5. **Buggy Calendar Utilities**
   - `actualEnd` calculation seems redundant
   - Manual sync detection could miss edge cases
   - Recurring event expansion logic is complex and untested

6. **State Management Issues**
   - Deep nesting in `calendar_hook.tsx` with multiple useEffects
   - No error boundaries around replication failures
   - Hard to debug and reason about

7. **Missing Features for Vendor Parity**
   - No calendar sharing/permissions
   - Limited import/export (only iCalendar export)
   - No calendar subscriptions
   - No event reminders/notifications
   - No drag-and-drop rescheduling
   - No timezone support
   - No search functionality

---

## Migration Strategy

### Phase 1: Foundation & Architecture (Week 1-2)

#### 1.1 Database Schema Redesign

**Objective:** Clean, normalized schema following RxDB best practices

**New Collections:**

```typescript
// Collection 1: calendar_events (v0)
{
  id: string,                    // UUID
  calendarId: string,            // Which calendar this belongs to
  title: string,
  description?: string,
  location?: string,
  isAllDay: boolean,
  startTime: number,             // Unix timestamp (UTC)
  endTime: number,               // Unix timestamp (UTC)
  timezone: string,              // IANA timezone (e.g., "Asia/Taipei")

  // Recurrence
  rrule?: string,                // RFC 5545 RRULE string (standard format)
  exdates?: number[],            // Excluded dates as timestamps
  recurrenceId?: number,         // For edited instances of recurring events

  // Metadata
  color?: string,
  tags: string[],                // Multiple tags support
  source: 'user' | 'timetable' | 'import',
  sourceId?: string,             // Original timetable course ID if synced

  // Sync
  lastModified: number,          // Unix timestamp
  deleted: boolean,              // Soft delete for sync

  // Future features
  reminders?: Reminder[],
  attendees?: Attendee[],
  attachments?: Attachment[]
}

// Collection 2: calendars (v0)
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

  // Permissions (future)
  ownerId: string,
  permissions?: Permission[],

  lastModified: number,
  deleted: boolean
}

// Collection 3: timetable_sync_state (v0)
{
  id: string,                    // semester ID
  calendarId: string,            // The calendar containing timetable events
  courseIds: string[],           // Current synced courses
  lastSync: number,
  checksum: string,              // Hash of course data for change detection

  lastModified: number
}
```

**Benefits:**
- Uses standard RRULE format (compatible with iCalendar, Google Calendar, etc.)
- Unix timestamps for easy timezone conversion
- Multi-calendar support from day 1
- Soft deletes for better sync
- Source tracking for bidirectional sync
- Ready for future features (reminders, sharing, etc.)

#### 1.2 Sync Architecture Redesign

**Objective:** Bidirectional sync between timetable ↔ calendar with conflict resolution

**New Sync Flow:**

```
Timetable Changes → Sync State Detection → Conflict Check → Merge → Update Calendar
                                              ↓
Calendar Changes → Source Check → Update Timetable (if source='timetable')
```

**Key Components:**

1. **TimetableSyncEngine** (`sync-engine.ts`)
   - Monitors timetable changes via checksum
   - Detects added/removed/modified courses
   - Creates/updates/soft-deletes calendar events
   - Maintains `timetable_sync_state`

2. **CalendarSyncEngine** (`calendar-sync.ts`)
   - Monitors calendar event changes
   - For `source='timetable'` events, updates timetable if user confirms
   - Prevents accidental timetable overwrites

3. **Conflict Resolution**
   - Timetable is source of truth for course schedules
   - Calendar can add extra info (location details, notes)
   - User prompted for destructive changes (delete course slot, change time)

4. **RxDB Replication**
   - Use RxDB's built-in replication with GraphQL backend (better than custom push/pull)
   - Implement proper conflict resolution middleware
   - Add retry logic with exponential backoff
   - Add offline queue for failed syncs

**File Structure:**
```
src/lib/
  sync/
    timetable-sync-engine.ts
    calendar-sync-engine.ts
    conflict-resolver.ts
    rxdb-replication.ts
```

#### 1.3 State Management Refactor

**Objective:** Clean, testable state management with proper error handling

**New Architecture:**

1. **RxDB as Single Source of Truth**
   - All data lives in RxDB collections
   - React components subscribe via RxDB hooks
   - No duplicate state in React hooks

2. **Zustand Store for UI State** (not data)
   ```typescript
   // calendar-store.ts
   {
     currentView: 'week' | 'month' | 'agenda',
     selectedDate: Date,
     selectedCalendars: string[],  // Filter which calendars to show
     sidebarOpen: boolean,
     // ... other UI state
   }
   ```

3. **Custom RxDB Hooks**
   ```typescript
   useCalendarEvents(calendarIds, startDate, endDate)
   useCalendars()
   useCalendar(id)
   useTimetableSyncState(semesterId)
   ```

4. **Error Boundaries**
   - `<CalendarErrorBoundary>` around calendar app
   - `<SyncErrorBoundary>` around sync components
   - User-friendly error messages with retry options

**File Structure:**
```
src/lib/
  store/
    calendar-ui-store.ts        // Zustand store for UI state

  hooks/
    use-calendar-events.ts
    use-calendars.ts
    use-timetable-sync.ts
```

---

### Phase 2: Core Calendar Reimplementation (Week 3-4)

#### 2.1 Calendar Utilities Rewrite

**Objective:** Robust, tested utility library using standard libraries

**Use `rrule` Library:**
- Don't reinvent recurrence logic
- Use well-tested `rrule` package (2.7M weekly downloads)
- Easy conversion to/from iCalendar format

**New Utilities:**

```typescript
// calendar-utils.ts

// Convert RRULE string + start date to event instances
function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): EventInstance[]

// Create RRULE from user-friendly form
function createRRule(config: RecurrenceConfig): string

// Timezone conversion utilities
function eventToUserTimezone(event: CalendarEvent, timezone: string): EventInstance
function eventToUTC(localEvent: EventInstance, timezone: string): CalendarEvent

// Date helpers (use date-fns)
function getWeekBounds(date: Date): [Date, Date]
function getMonthBounds(date: Date): [Date, Date]
function getMonthGrid(date: Date): Date[][] // 6x7 grid

// Event overlap detection
function detectOverlaps(events: EventInstance[]): OverlapGroup[]

// Search/filter
function searchEvents(events: CalendarEvent[], query: string): CalendarEvent[]
function filterByTags(events: CalendarEvent[], tags: string[]): CalendarEvent[]
```

**Testing:**
- Unit test every utility function
- Test edge cases: DST transitions, leap years, end-of-month
- Test with multiple timezones

#### 2.2 UI Component Redesign

**Objective:** Clean, accessible, performant components

**Component Architecture:**

```
<CalendarApp>
  <CalendarHeader>
    <ViewSelector />
    <DateNavigator />
    <CalendarFilter />
    <SearchBar />
  </CalendarHeader>

  <CalendarSidebar>
    <MiniCalendar />
    <CalendarList />
    <UpcomingEvents />
  </CalendarSidebar>

  <CalendarMain>
    {/* Conditional rendering based on view */}
    <WeekView />
    <MonthView />
    <AgendaView />
    <DayView />    {/* New */}
  </CalendarMain>

  <EventDialog />
  <SyncDialog />
</CalendarApp>
```

**Key Improvements:**

1. **WeekView Rewrite**
   - Use CSS Grid for hour grid
   - Virtualization for scrolling performance
   - Drag-and-drop event rescheduling
   - Multi-day event spanning
   - Current time indicator with auto-scroll

2. **MonthView Rewrite**
   - Virtualized month grid
   - Show 2-3 events per day with "+N more" indicator
   - Click to expand day details
   - Drag-and-drop between days

3. **New AgendaView**
   - Infinite scroll list of upcoming events
   - Group by date
   - Search and filter
   - Fast navigation

4. **New DayView**
   - Detailed single-day view
   - More space for event details
   - Optimized for mobile

5. **EventDialog Improvements**
   - Better recurrence UI (similar to Google Calendar)
   - Timezone selector
   - Tag management with autocomplete
   - Location autocomplete (use existing course venues)
   - Reminder settings
   - Color picker per event

**UI Library:**
- Continue using shadcn/ui + Tailwind
- Add `react-beautiful-dnd` or `@dnd-kit` for drag-and-drop
- Add `react-virtuoso` for virtualization
- Use `react-hook-form` + `zod` for event forms

**Accessibility:**
- Keyboard navigation (arrow keys, vim bindings)
- Screen reader support (ARIA labels)
- Focus management
- High contrast mode support

**File Structure:**
```
src/components/
  Calendar/
    CalendarApp.tsx
    CalendarHeader/
      ViewSelector.tsx
      DateNavigator.tsx
      CalendarFilter.tsx
      SearchBar.tsx
    CalendarSidebar/
      MiniCalendar.tsx
      CalendarList.tsx
      UpcomingEvents.tsx
    Views/
      WeekView/
        WeekView.tsx
        WeekGrid.tsx
        EventBlock.tsx
        CurrentTimeIndicator.tsx
      MonthView/
        MonthView.tsx
        MonthGrid.tsx
        DayCell.tsx
      AgendaView/
        AgendaView.tsx
        AgendaList.tsx
      DayView/
        DayView.tsx
    Dialogs/
      EventDialog/
        EventDialog.tsx
        EventForm.tsx
        RecurrenceSelector.tsx
        ReminderSelector.tsx
      SyncDialog.tsx
```

---

### Phase 3: Testing Infrastructure (Week 5)

#### 3.1 Unit Tests

**Objective:** 100% coverage of utilities and business logic

**Framework:** Vitest (fast, Vite-native)

**Test Files:**
```
src/lib/
  utils/
    calendar-utils.test.ts      // Calendar utilities
    recurrence.test.ts          // RRULE handling
    timezone.test.ts            // Timezone conversion
  sync/
    timetable-sync-engine.test.ts
    calendar-sync-engine.test.ts
    conflict-resolver.test.ts
  hooks/
    use-calendar-events.test.ts
    use-timetable-sync.test.ts
```

**Coverage Requirements:**
- All utility functions: 100%
- Sync engines: 100%
- Hooks: 90%+
- Edge cases: DST, leap years, end-of-month, timezones

#### 3.2 Component Tests

**Objective:** Test component behavior and interactions

**Framework:** Vitest + React Testing Library

**Test Files:**
```
src/components/Calendar/
  Views/
    WeekView/
      WeekView.test.tsx
      WeekGrid.test.tsx
    MonthView/
      MonthView.test.tsx
    AgendaView/
      AgendaView.test.tsx
  Dialogs/
    EventDialog/
      EventForm.test.tsx
      RecurrenceSelector.test.tsx
```

**Test Coverage:**
- Event rendering in different views
- Event creation/editing/deletion
- Recurrence UI
- Drag-and-drop interactions
- Keyboard navigation
- Search and filter

#### 3.3 Browser/E2E Tests

**Objective:** Test real user workflows in actual browser

**Framework:** Playwright

**Test Scenarios:**

```typescript
// e2e/calendar/
//   event-lifecycle.spec.ts
test('User can create, edit, and delete an event', async ({ page }) => {
  // 1. Navigate to calendar
  // 2. Click "Add Event" button
  // 3. Fill in event details
  // 4. Save event
  // 5. Verify event appears in calendar
  // 6. Click event to edit
  // 7. Modify details
  // 8. Save changes
  // 9. Verify changes reflected
  // 10. Delete event
  // 11. Verify event removed
})

test('Recurring events work correctly', async ({ page }) => {
  // 1. Create weekly recurring event
  // 2. Verify multiple instances appear
  // 3. Edit single instance
  // 4. Verify only that instance changed
  // 5. Edit all future instances
  // 6. Verify correct instances changed
  // 7. Delete series
})

test('Timetable to calendar sync works', async ({ page }) => {
  // 1. Add courses to timetable
  // 2. Navigate to calendar
  // 3. Accept sync dialog
  // 4. Verify timetable events appear
  // 5. Remove course from timetable
  // 6. Verify calendar updated
  // 7. Modify timetable event time in calendar
  // 8. Verify conflict resolution dialog
})

test('Calendar syncs across tabs', async ({ browser }) => {
  // 1. Open calendar in two tabs
  // 2. Create event in tab 1
  // 3. Verify event appears in tab 2 (RxDB live replication)
  // 4. Edit event in tab 2
  // 5. Verify changes in tab 1
})

test('Offline mode works', async ({ page, context }) => {
  // 1. Load calendar
  // 2. Go offline (network interception)
  // 3. Create/edit events
  // 4. Go back online
  // 5. Verify events synced to server
})

test('Month view navigation', async ({ page }) => {
  // 1. Navigate through months
  // 2. Verify events load correctly
  // 3. Click on day to expand
  // 4. Verify day details shown
})

test('Week view drag and drop', async ({ page }) => {
  // 1. Create event
  // 2. Drag event to different time
  // 3. Verify time updated
  // 4. Drag event to different day
  // 5. Verify date updated
})

test('Search functionality', async ({ page }) => {
  // 1. Create several events
  // 2. Search for event title
  // 3. Verify correct events shown
  // 4. Filter by tag
  // 5. Verify filtered results
})

test('Import/Export', async ({ page }) => {
  // 1. Create events
  // 2. Export to iCalendar
  // 3. Verify file contents
  // 4. Import iCalendar file
  // 5. Verify events created
})
```

**Visual Regression Tests:**
```typescript
// e2e/visual/
//   calendar-views.spec.ts

test('Week view looks correct', async ({ page }) => {
  await expect(page).toHaveScreenshot('week-view.png')
})

test('Month view looks correct', async ({ page }) => {
  await expect(page).toHaveScreenshot('month-view.png')
})

test('Event dialog looks correct', async ({ page }) => {
  await expect(page).toHaveScreenshot('event-dialog.png')
})
```

**Performance Tests:**
```typescript
test('Calendar renders 1000 events in < 1s', async ({ page }) => {
  // 1. Seed database with 1000 events
  // 2. Navigate to month view
  // 3. Measure render time
  // 4. Assert < 1000ms
})

test('Scrolling is smooth with many events', async ({ page }) => {
  // 1. Create 100+ events in week view
  // 2. Scroll through week
  // 3. Measure FPS
  // 4. Assert FPS > 30
})
```

**CI Integration:**
- Run on every PR
- Parallel test execution
- Video recording on failure
- Screenshot diffs for visual regression

---

### Phase 4: Feature Parity & Advanced Features (Week 6-7)

#### 4.1 Calendar Vendor Feature Comparison

| Feature | Google Calendar | Apple Calendar | Outlook | Current | Target |
|---------|----------------|----------------|---------|---------|--------|
| Multiple calendars | ✅ | ✅ | ✅ | ❌ | ✅ |
| Recurring events | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event search | ✅ | ✅ | ✅ | ❌ | ✅ |
| Drag-and-drop | ✅ | ✅ | ✅ | ❌ | ✅ |
| Reminders/notifications | ✅ | ✅ | ✅ | ❌ | ✅ |
| Timezone support | ✅ | ✅ | ✅ | ❌ | ✅ |
| Import/Export (iCal) | ✅ | ✅ | ✅ | Export only | ✅ |
| Calendar subscriptions | ✅ | ✅ | ✅ | ❌ | ✅ |
| Event attachments | ✅ | ✅ | ✅ | ❌ | 🔄 Phase 5 |
| Calendar sharing | ✅ | ✅ | ✅ | ❌ | 🔄 Phase 5 |
| Guest invitations | ✅ | ✅ | ✅ | ❌ | 🔄 Phase 5 |
| Video conferencing | ✅ | ✅ | ✅ | ❌ | ❌ Out of scope |
| Week numbers | ✅ | ✅ | ✅ | ❌ | ✅ |
| Work hours | ✅ | ✅ | ✅ | ❌ | ✅ |
| Natural language input | ✅ | ✅ | ✅ | ❌ | 🔄 Phase 5 |
| Mobile apps | ✅ | ✅ | ✅ | ❌ | ❌ Web-only |

#### 4.2 Priority Features to Implement

**P0 (Must Have):**
1. ✅ Multiple calendars with visibility toggle
2. ✅ Event search (title, description, location)
3. ✅ Drag-and-drop rescheduling
4. ✅ Timezone support
5. ✅ iCalendar import/export
6. ✅ Reminders (browser notifications)

**P1 (Should Have):**
7. ✅ Calendar subscriptions (read-only URL calendars)
8. ✅ Week numbers
9. ✅ Work hours highlighting
10. ✅ Event color per event (not just per calendar)
11. ✅ Multi-day event spanning
12. ✅ All-day event section

**P2 (Nice to Have - Phase 5):**
13. Event attachments
14. Natural language event creation ("Lunch tomorrow at noon")
15. Event templates
16. Calendar sharing/permissions

#### 4.3 Implementation Details

**4.3.1 Multiple Calendars**

UI:
- Sidebar shows list of calendars with checkboxes
- Each calendar has name, color, visibility toggle
- "Add Calendar" button → create new calendar or subscribe to URL

Backend:
- Calendar management API endpoints
- Cascade delete events when calendar deleted (soft delete)

**4.3.2 Event Search**

Implementation:
- Full-text search using RxDB queries
- Search fields: title, description, location, tags
- Debounced input
- Highlight search terms in results
- Recent searches saved

**4.3.3 Drag-and-Drop**

Libraries:
- `@dnd-kit/core` (better than react-beautiful-dnd for calendars)

Functionality:
- Drag event to new time slot → update start/end time
- Drag event to new day → update date
- Drag all-day event to time slot → convert to timed event
- Drag timed event to all-day section → convert to all-day
- Undo/redo support

**4.3.4 Timezone Support**

Implementation:
- Store all times in UTC (unix timestamps)
- Display in user's timezone (browser default or user setting)
- Timezone selector in event form
- Show event time in both original timezone and user timezone
- Handle DST transitions correctly

Library: `date-fns-tz`

**4.3.5 iCalendar Import**

Implementation:
- File upload dialog
- Parse .ics file using `ical.js` library
- Map VEVENT to CalendarEvent schema
- Handle RRULE parsing
- Show preview of events to import
- Let user select destination calendar
- Bulk insert events

**4.3.6 Reminders**

Implementation:
- Add `reminders: Reminder[]` to event schema
  ```typescript
  interface Reminder {
    id: string
    minutes: number  // Minutes before event
    method: 'notification' | 'email' // Start with notification
  }
  ```

- Background worker checks for upcoming events
- Request notification permission on first reminder
- Show browser notification at reminder time
- Click notification → jump to event

Worker:
```typescript
// service-worker.ts
// Check every minute for events with reminders
setInterval(() => {
  const upcomingEvents = getEventsWithRemindersInNext60Seconds()
  upcomingEvents.forEach(event => {
    scheduleNotification(event)
  })
}, 60000)
```

**4.3.7 Calendar Subscriptions**

Implementation:
- Add subscription URL field to calendar
- Background job fetches .ics from URL
- Parse and store events (mark as read-only)
- Refresh every 6 hours
- Show last sync time
- Handle subscription errors gracefully

Use Cases:
- Subscribe to public holiday calendars
- Subscribe to sports team schedules
- Subscribe to university event calendar

---

### Phase 5: Data Import/Export & Interoperability (Week 8)

#### 5.1 Export Formats

**iCalendar (.ics) - COMPLETE**
- Already implemented in `/services/secure-api/src/utils/icalendar.ts`
- Well-tested (599 lines of tests)
- Supports all event types and recurrence patterns
- **Action:** Update to include new fields (timezone, reminders, etc.)

**Google Calendar Import**
- Use Google Calendar API
- OAuth flow for user authorization
- Fetch events from selected calendars
- Map Google event format to CalendarEvent
- One-time import or continuous sync

**CSV Export**
- Simple table format for spreadsheet software
- Columns: Title, Start, End, Location, Description, Tags, Calendar
- Useful for reporting and analysis

**JSON Export**
- Full schema export for backup
- Can re-import to restore data
- Useful for migration between instances

#### 5.2 Import Formats

**iCalendar (.ics)**
- Parse using `ical.js`
- Handle RRULE conversion
- Handle EXDATE (exclusions)
- Handle VALARM (reminders)
- Handle VTIMEZONE
- Validation and error handling

**Google Calendar**
- OAuth flow
- Use Google Calendar API v3
- Map fields appropriately
- Handle recurring events
- Import selected calendars only

**CSV Import**
- Parse CSV file
- Map columns to event fields
- Date/time parsing with timezone detection
- Validation
- Preview before import

#### 5.3 Sync Protocols

**CalDAV Support (Future)**
- Standard protocol for calendar sync
- Would enable sync with Apple Calendar, Thunderbird, etc.
- Requires server-side CalDAV implementation
- **Decision:** Out of scope for now, but architecture should support

**Data Portability**
- Export all data as JSON
- Include calendars, events, settings
- One-click export
- One-click import
- Useful for:
  - Backups
  - Moving between devices
  - Migrating to new account

---

### Phase 6: UI/UX Polish (Week 9)

#### 6.1 Design Improvements

**Current UI Assessment:**
- Good: Clean, modern design with shadcn/ui
- Good: Dark mode support
- Needs improvement: Dense information, hard to scan
- Needs improvement: Mobile responsiveness
- Needs improvement: Loading states
- Needs improvement: Empty states

**Proposed Improvements:**

1. **Better Visual Hierarchy**
   - Larger, clearer event titles
   - Better contrast for event blocks
   - Subtle shadows for depth
   - Consistent spacing

2. **Enhanced Event Blocks**
   - Color-coded left border (not full background)
   - Icon indicators (recurring, reminder, location)
   - Time shown in block (not just position)
   - Hover state shows more details

3. **Improved Navigation**
   - Sticky header with date/view controls
   - Breadcrumbs for current date
   - Quick jump to today
   - Mini calendar for date picking

4. **Loading & Empty States**
   - Skeleton loaders for event lists
   - Animated loading indicators
   - Friendly empty state illustrations
   - Helpful empty state CTAs

5. **Mobile Optimization**
   - Bottom navigation for mobile
   - Swipe gestures (left/right for nav, up/down for scroll)
   - Larger touch targets
   - Mobile-optimized event dialog (full screen)
   - Pull-to-refresh

6. **Animations**
   - Smooth view transitions
   - Event create/delete animations
   - Calendar flip animation (month change)
   - Drag preview
   - Toast notifications for actions

#### 6.2 Accessibility Improvements

1. **Keyboard Navigation**
   - Arrow keys: Navigate between days/events
   - Enter: Select/open event
   - Escape: Close dialogs
   - n: New event
   - /: Focus search
   - t: Jump to today
   - 1-4: Switch views (week/month/day/agenda)

2. **Screen Reader Support**
   - Semantic HTML elements
   - ARIA labels for all interactive elements
   - ARIA live regions for dynamic content
   - Descriptive button labels
   - Focus indicators

3. **High Contrast Mode**
   - Test with Windows High Contrast
   - Ensure sufficient contrast ratios
   - Don't rely only on color

4. **Reduced Motion**
   - Respect `prefers-reduced-motion`
   - Disable animations for users who prefer reduced motion

#### 6.3 Performance Optimizations

1. **Virtualization**
   - Virtualized month grid (only render visible cells)
   - Virtualized event list in agenda view
   - Lazy load event details

2. **Memoization**
   - Memoize expensive calculations (recurring event expansion)
   - Memoize React components
   - Use `useMemo` for derived state

3. **Code Splitting**
   - Lazy load views (only load active view)
   - Lazy load dialogs
   - Lazy load export/import modules

4. **Image Optimization**
   - Use next/image for optimized images
   - Lazy load images
   - WebP format with fallbacks

5. **Bundle Size**
   - Tree-shake unused code
   - Use lightweight alternatives where possible
   - Monitor bundle size in CI

---

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Design new RxDB schemas
- [ ] Implement calendar, events, timetable_sync_state collections
- [ ] Migrate existing data to new schema
- [ ] Set up Zustand store for UI state
- [ ] Implement custom RxDB hooks
- [ ] Set up error boundaries
- [ ] Implement TimetableSyncEngine
- [ ] Implement CalendarSyncEngine
- [ ] Implement conflict resolver
- [ ] Set up improved RxDB replication

### Week 3-4: Core Calendar
- [ ] Rewrite calendar utilities using `rrule` library
- [ ] Implement timezone support with `date-fns-tz`
- [ ] Rebuild WeekView component
- [ ] Rebuild MonthView component
- [ ] Build new AgendaView component
- [ ] Build new DayView component
- [ ] Rebuild EventDialog with improved UX
- [ ] Implement drag-and-drop with `@dnd-kit`
- [ ] Implement keyboard navigation

### Week 5: Testing
- [ ] Set up Vitest for unit tests
- [ ] Write unit tests for all utilities (100% coverage)
- [ ] Write unit tests for sync engines (100% coverage)
- [ ] Write component tests with React Testing Library
- [ ] Set up Playwright for E2E tests
- [ ] Write E2E test scenarios (10+ tests)
- [ ] Write visual regression tests
- [ ] Write performance tests
- [ ] Set up CI to run all tests

### Week 6-7: Feature Parity
- [ ] Implement multiple calendars
- [ ] Implement event search
- [ ] Implement reminders with notifications
- [ ] Update iCalendar export with new fields
- [ ] Implement iCalendar import
- [ ] Implement calendar subscriptions
- [ ] Implement week numbers
- [ ] Implement work hours highlighting
- [ ] Implement per-event colors
- [ ] Implement multi-day event spanning

### Week 8: Data Interop
- [ ] Implement CSV export
- [ ] Implement CSV import
- [ ] Implement JSON export/import
- [ ] Implement Google Calendar import (OAuth)
- [ ] Implement data portability (full export)
- [ ] Test all import/export formats

### Week 9: Polish
- [ ] UI/UX improvements per design spec
- [ ] Mobile optimizations
- [ ] Accessibility improvements
- [ ] Performance optimizations
- [ ] Animation polish
- [ ] Empty states
- [ ] Loading states
- [ ] Documentation

---

## Migration Path for Existing Users

### Automatic Migration

1. **Schema Migration**
   - RxDB migration function converts v1 events → v0 (new schema)
   - Create default calendar for existing events
   - Convert old recurrence format to RRULE
   - Migrate timetablesync → timetable_sync_state

2. **Data Integrity**
   - Validate all events after migration
   - Provide rollback option
   - Export backup before migration
   - Log migration errors

3. **User Communication**
   - Show migration progress dialog
   - Explain new features
   - Offer quick tutorial
   - Link to full documentation

### Gradual Rollout

1. **Beta Testing**
   - Deploy to beta users first
   - Collect feedback
   - Fix critical bugs
   - Iterate on UX

2. **Feature Flags**
   - Use feature flags to enable new calendar gradually
   - Allow users to opt-in to beta
   - Fall back to old calendar if issues

3. **Deprecation Timeline**
   - Month 1: Beta release
   - Month 2: Stable release (default for new users)
   - Month 3: Prompt existing users to migrate
   - Month 4: Sunset old calendar

---

## Testing Strategy Summary

### Test Pyramid

```
       E2E Tests (10%)
     /     Playwright     \
    /  - User workflows    \
   /   - Visual regression  \
  --------------------------------
     Integration Tests (20%)
   /  - Component tests      \
  /   - Sync engine tests     \
 --------------------------------
        Unit Tests (70%)
   - Utilities (100% coverage)
   - Business logic
   - Hooks
   - Helpers
```

### Continuous Testing

- **Pre-commit:** Run unit tests (fast)
- **CI on PR:** Run all tests (unit + integration + E2E)
- **Nightly:** Full E2E suite + visual regression
- **Release:** Full test suite + manual QA

### Test Coverage Goals

- **Unit tests:** 90%+ coverage
- **Integration tests:** Cover all major user flows
- **E2E tests:** Cover critical paths (10+ scenarios)
- **Visual regression:** All major UI components

---

## Success Metrics

### Performance
- [ ] Initial load < 2s
- [ ] Event rendering < 100ms for 100 events
- [ ] Smooth scrolling (60 FPS)
- [ ] Bundle size < 500KB (gzipped)

### Reliability
- [ ] Zero data loss in sync
- [ ] < 1% error rate in production
- [ ] Offline mode works 100% of time
- [ ] Migration success rate > 99%

### Test Coverage
- [ ] 90%+ unit test coverage
- [ ] 100% critical path E2E coverage
- [ ] All UI components have visual regression tests

### Feature Parity
- [ ] Match Google Calendar core features
- [ ] iCalendar import/export works with all major vendors
- [ ] Calendar subscriptions work with public calendars

### User Experience
- [ ] WCAG 2.1 Level AA compliance
- [ ] Mobile-friendly (responsive design)
- [ ] < 3 clicks to create event
- [ ] < 2 seconds to find event via search

---

## Risk Assessment

### High Risk

**Risk:** Data loss during migration
- **Mitigation:** Automatic backup before migration, rollback option, extensive testing
- **Contingency:** Manual data recovery tools, support for restoring from export

**Risk:** RxDB replication conflicts
- **Mitigation:** Proper conflict resolution, last-write-wins with user notification
- **Contingency:** Manual conflict resolution UI

**Risk:** Performance degradation with many events
- **Mitigation:** Virtualization, lazy loading, pagination, performance tests
- **Contingency:** Database query optimization, indexing

### Medium Risk

**Risk:** Timezone bugs
- **Mitigation:** Use well-tested `date-fns-tz`, comprehensive timezone unit tests
- **Contingency:** User can manually adjust event times

**Risk:** Browser compatibility
- **Mitigation:** Test on major browsers (Chrome, Firefox, Safari, Edge), polyfills
- **Contingency:** Graceful degradation, warning message for unsupported browsers

**Risk:** Import/export format incompatibility
- **Mitigation:** Test with real .ics files from major vendors, validation
- **Contingency:** Manual event creation, support for fixing import issues

### Low Risk

**Risk:** UI/UX not intuitive
- **Mitigation:** User testing, beta program, iteration
- **Contingency:** Tutorial, documentation, quick fixes

**Risk:** Third-party library bugs
- **Mitigation:** Use well-maintained libraries, lock versions, test thoroughly
- **Contingency:** Fork library, implement workaround, or find alternative

---

## Dependencies

### Core Libraries
- `rxdb` - Database (already in use)
- `rxjs` - Reactive programming (RxDB dependency)
- `date-fns` - Date manipulation (already in use)
- `date-fns-tz` - Timezone support (new)
- `rrule` - Recurrence rule parsing/generation (new)

### UI Libraries
- `react` - UI framework (already in use)
- `@dnd-kit/core` - Drag and drop (new)
- `react-virtuoso` - Virtualization (new)
- `react-hook-form` - Form management (already in use)
- `zod` - Validation (already in use)
- `shadcn/ui` - UI components (already in use)

### Import/Export
- `ical.js` - iCalendar parsing (new)
- `papaparse` - CSV parsing (new)

### Testing
- `vitest` - Unit testing (new)
- `@testing-library/react` - Component testing (new)
- `@playwright/test` - E2E testing (new)
- `@playwright/test` - Visual regression (new)

### Utilities
- `nanoid` - ID generation (already in use)
- `zustand` - State management (new)

---

## Open Questions

1. **Timezone Default:** Should we default to browser timezone or allow user to set preferred timezone?
   - **Recommendation:** Default to browser, with setting to override

2. **Timetable Calendar Visibility:** Should timetable-synced events live in a separate calendar or be tagged?
   - **Recommendation:** Separate calendar per semester (more flexible, can hide/show)

3. **Recurring Event Edits:** When user edits recurring event, edit "this event", "this and future", or "all events"?
   - **Recommendation:** Show dialog with all 3 options (like Google Calendar)

4. **Conflict Resolution:** Timetable vs calendar - which wins?
   - **Recommendation:** Timetable is source of truth for times, calendar can add details

5. **Notification Permissions:** When to ask for notification permission?
   - **Recommendation:** When user adds first reminder, with clear explanation

6. **Calendar Subscription Refresh:** How often to refresh subscribed calendars?
   - **Recommendation:** Every 6 hours, with manual refresh option

7. **Mobile App:** Should we build native mobile apps?
   - **Recommendation:** PWA first, native apps if demand is high

8. **Collaboration Features:** Should we support shared calendars and event invitations?
   - **Recommendation:** Phase 5, after core features are solid

---

## Conclusion

This migration plan provides a comprehensive path to rebuild the calendar suite with:

1. ✅ **Clean Architecture** - Proper separation between timetable and calendar with robust syncing
2. ✅ **Best Practices** - Modern RxDB usage with proper schemas and replication
3. ✅ **Better UI** - Improved design with drag-and-drop, search, and multiple views
4. ✅ **Comprehensive Testing** - Unit, integration, and E2E tests with CI/CD
5. ✅ **Feature Parity** - Match major calendar vendors (Google, Apple, Outlook)
6. ✅ **Data Interoperability** - Import/export in standard formats (iCalendar, CSV, JSON)

**Estimated Timeline:** 9 weeks for full implementation

**Key Milestones:**
- Week 2: Foundation complete, data migration working
- Week 4: Core calendar reimplemented
- Week 5: Full test coverage
- Week 7: Feature parity achieved
- Week 9: Polished, production-ready

**Next Steps:**
1. Review and approve this plan
2. Set up project tracking (GitHub issues/project board)
3. Begin Week 1 implementation
4. Weekly check-ins to review progress

This plan is ambitious but achievable. The key is to maintain the separation between timetable and calendar while providing seamless syncing, leverage standard libraries instead of reinventing the wheel, and ensure everything is thoroughly tested.
