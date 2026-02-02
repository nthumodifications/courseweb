/**
 * Migration from old calendar (events v1) to new calendar (calendar_events v0)
 *
 * This script handles the migration of all calendar data from the old schema
 * to the new optimized schema with proper indexes and standard formats.
 */

import { RxDatabase } from "rxdb";
import { RRule } from "rrule";
import { v4 as uuidv4 } from "uuid";
import type { EventDocType } from "@/config/rxdb";
import type { CalendarEvent, Calendar } from "@/config/rxdb-calendar-v2";

export interface MigrationResult {
  success: boolean;
  migratedEvents: number;
  errorCount: number;
  errors: Array<{ eventId: string; error: string }>;
  defaultCalendarId: string;
}

export interface MigrationProgress {
  phase:
    | "backup"
    | "creating-calendar"
    | "migrating"
    | "validating"
    | "complete"
    | "error";
  current: number;
  total: number;
  message: string;
}

/**
 * Main migration function
 */
export async function migrateCalendarV1ToV2(
  db: RxDatabase,
  onProgress?: (progress: MigrationProgress) => void,
): Promise<MigrationResult> {
  console.log("[Migration] Starting calendar v1 → v2 migration");

  const errors: Array<{ eventId: string; error: string }> = [];

  try {
    // Phase 1: Backup old data
    onProgress?.({
      phase: "backup",
      current: 0,
      total: 1,
      message: "Creating backup of existing calendar data...",
    });

    const oldEvents = await db.events.find().exec();
    const backup = {
      version: 1,
      timestamp: Date.now(),
      events: oldEvents.map((e) => e.toJSON()),
    };

    // Save backup to localStorage (max 5MB typically, should be fine for calendar events)
    try {
      localStorage.setItem("calendar_migration_backup", JSON.stringify(backup));
      console.log(`[Migration] Backed up ${oldEvents.length} events`);
    } catch (e) {
      console.warn("[Migration] Failed to save backup to localStorage:", e);
      // Continue anyway, we can still migrate
    }

    // Phase 2: Create default calendar
    onProgress?.({
      phase: "creating-calendar",
      current: 0,
      total: 1,
      message: "Creating default calendar...",
    });

    const defaultCalendarId = uuidv4();
    const now = Date.now();

    await db.calendars.insert({
      id: defaultCalendarId,
      name: "My Calendar",
      description: "Default calendar for personal events",
      color: "#3b82f6",
      isDefault: true,
      isVisible: true,
      source: "user",
      lastModified: now,
      isDeleted: false,
    } as Calendar);

    console.log(`[Migration] Created default calendar: ${defaultCalendarId}`);

    // Phase 3: Migrate each event
    onProgress?.({
      phase: "migrating",
      current: 0,
      total: oldEvents.length,
      message: `Migrating events (0/${oldEvents.length})...`,
    });

    let migratedCount = 0;

    for (let i = 0; i < oldEvents.length; i++) {
      const oldEvent = oldEvents[i];

      try {
        const oldData = oldEvent.toJSON() as EventDocType;

        // Convert old event to new format
        const newEvent = await convertOldEventToNew(oldData, defaultCalendarId);

        // Insert into new collection
        await db.calendar_events.insert(newEvent);

        migratedCount++;

        // Update progress every 10 events
        if (migratedCount % 10 === 0 || migratedCount === oldEvents.length) {
          onProgress?.({
            phase: "migrating",
            current: migratedCount,
            total: oldEvents.length,
            message: `Migrating events (${migratedCount}/${oldEvents.length})...`,
          });
        }
      } catch (error) {
        console.error(
          `[Migration] Failed to migrate event ${oldEvent.id}:`,
          error,
        );
        errors.push({
          eventId: oldEvent.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      `[Migration] Migrated ${migratedCount}/${oldEvents.length} events`,
    );

    // Phase 4: Validation
    onProgress?.({
      phase: "validating",
      current: 0,
      total: 1,
      message: "Validating migrated data...",
    });

    const migratedEvents = await db.calendar_events
      .find({ selector: { isDeleted: false } })
      .exec();
    console.log(
      `[Migration] Validation: Found ${migratedEvents.length} events in new collection`,
    );

    // Phase 5: Complete
    const migrationStatus = {
      completed: true,
      timestamp: Date.now(),
      migratedCount,
      errorCount: errors.length,
      backupAvailable: true,
      oldEventCount: oldEvents.length,
      newEventCount: migratedEvents.length,
    };

    localStorage.setItem(
      "calendar_migration_status",
      JSON.stringify(migrationStatus),
    );

    onProgress?.({
      phase: "complete",
      current: migratedCount,
      total: oldEvents.length,
      message: `Migration complete! ${migratedCount} events migrated successfully.`,
    });

    return {
      success: true,
      migratedEvents: migratedCount,
      errorCount: errors.length,
      errors,
      defaultCalendarId,
    };
  } catch (error) {
    console.error("[Migration] Fatal error during migration:", error);

    onProgress?.({
      phase: "error",
      current: 0,
      total: 0,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    });

    return {
      success: false,
      migratedEvents: 0,
      errorCount: errors.length + 1,
      errors: [
        ...errors,
        {
          eventId: "MIGRATION_ERROR",
          error: error instanceof Error ? error.message : String(error),
        },
      ],
      defaultCalendarId: "",
    };
  }
}

/**
 * Convert old event format to new format
 */
async function convertOldEventToNew(
  oldEvent: EventDocType,
  defaultCalendarId: string,
): Promise<CalendarEvent> {
  const now = Date.now();

  // Convert dates from ISO strings to unix timestamps
  const startTime = new Date(oldEvent.start).getTime();
  const endTime = new Date(oldEvent.end).getTime();

  // Convert old repeat format to RRULE
  let rrule: string | undefined;
  if (oldEvent.repeat) {
    rrule = convertOldRepeatToRRule(oldEvent);
  }

  // Convert excluded dates
  let exdates: number[] | undefined;
  if (oldEvent.excludedDates && oldEvent.excludedDates.length > 0) {
    exdates = oldEvent.excludedDates.map((d) => new Date(d).getTime());
  }

  // Determine source and sourceId
  let source: "user" | "timetable" | "import" = "user";
  let sourceId: string | undefined;

  // If tag is 'Course', it's likely from timetable
  if (oldEvent.tag === "Course") {
    source = "timetable";
    // Try to extract course ID from title (format: "CSXXX - Course Name")
    sourceId = extractCourseIdFromTitle(oldEvent.title);
  }

  // Determine recurrenceId (for edited instances of recurring events)
  let recurrenceId: number | undefined;
  if (oldEvent.parentId) {
    // This is an edited instance, use the start time as recurrence ID
    recurrenceId = startTime;
  }

  const newEvent: CalendarEvent = {
    id: oldEvent.id,
    calendarId: defaultCalendarId,
    title: oldEvent.title,
    description: oldEvent.details || undefined,
    location: oldEvent.location || undefined,
    isAllDay: oldEvent.allDay,
    startTime,
    endTime,
    timezone: "Asia/Taipei", // Default timezone for Taiwan

    rrule,
    exdates,
    recurrenceId,

    color: oldEvent.color || undefined,
    tags: oldEvent.tag ? [oldEvent.tag] : [],
    source,
    sourceId,

    lastModified: now,
    isDeleted: false,
  };

  return newEvent;
}

/**
 * Convert old repeat format to RRULE standard format
 */
function convertOldRepeatToRRule(oldEvent: EventDocType): string {
  if (!oldEvent.repeat) return "";

  const startDate = new Date(oldEvent.start);

  let freq: any;
  switch (oldEvent.repeat.type) {
    case "daily":
      freq = RRule.DAILY;
      break;
    case "weekly":
      freq = RRule.WEEKLY;
      break;
    case "monthly":
      freq = RRule.MONTHLY;
      break;
    case "yearly":
      freq = RRule.YEARLY;
      break;
    default:
      freq = RRule.WEEKLY;
  }

  const ruleOptions: any = {
    freq,
    interval: oldEvent.repeat.interval || 1,
    dtstart: startDate,
  };

  if (oldEvent.repeat.mode === "count") {
    ruleOptions.count = oldEvent.repeat.value;
  } else if (oldEvent.repeat.mode === "date" && oldEvent.repeat.value) {
    ruleOptions.until = new Date(oldEvent.repeat.value);
  }

  const rule = new RRule(ruleOptions);
  return rule.toString();
}

/**
 * Extract course ID from title
 * Handles formats like:
 * - "CS101 - Introduction to Computer Science"
 * - "MATH201 Linear Algebra"
 * - "PHYS101A - Physics I"
 */
function extractCourseIdFromTitle(title: string): string | undefined {
  // Try to match course code patterns
  const patterns = [
    /^([A-Z]{2,4}\d{3,4}[A-Z]?)\s*[-:]/, // "CS101 -" or "MATH201A:"
    /^([A-Z]{2,4}\d{3,4}[A-Z]?)\s/, // "CS101 "
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Rollback migration (restore from backup)
 */
export async function rollbackMigration(db: RxDatabase): Promise<boolean> {
  try {
    console.log("[Migration] Starting rollback...");

    const backupStr = localStorage.getItem("calendar_migration_backup");
    if (!backupStr) {
      console.error("[Migration] No backup found");
      return false;
    }

    const backup = JSON.parse(backupStr);

    // Remove all new events
    await db.calendar_events.find().remove();

    // Remove default calendar
    await db.calendars.find().remove();

    console.log("[Migration] Rollback complete");

    // Clear migration status
    localStorage.removeItem("calendar_migration_status");

    return true;
  } catch (error) {
    console.error("[Migration] Rollback failed:", error);
    return false;
  }
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(db: RxDatabase): Promise<boolean> {
  try {
    // Check if migration already completed
    const statusStr = localStorage.getItem("calendar_migration_status");
    if (statusStr) {
      const status = JSON.parse(statusStr);
      if (status.completed) {
        return false;
      }
    }

    // Check if old events collection has data
    const oldEvents = await db.events?.find().exec();
    if (!oldEvents || oldEvents.length === 0) {
      return false;
    }

    // Check if new calendar_events collection is empty
    const newEvents = await db.calendar_events?.find().exec();
    if (newEvents && newEvents.length > 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Migration] Error checking migration status:", error);
    return false;
  }
}
