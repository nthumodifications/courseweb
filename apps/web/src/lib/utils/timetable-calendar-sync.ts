/**
 * Timetable Calendar Sync
 *
 * Syncs timetable courses to the calendar as recurring events using RRULE.
 * Allows users to modify individual occurrences while maintaining auto-sync.
 */

import type { RxDatabase } from "rxdb";
import { RRule } from "rrule";
import { scheduleTimeSlots } from "@courseweb/shared";
import type { CourseTimeslotData } from "@/types/timetable";
import type { CalendarDatabase } from "@/config/rxdb-calendar-v2";

const TIMETABLE_CALENDAR_ID = "timetable-calendar";
const TIMETABLE_CALENDAR_NAME = "Timetable";
const TIMETABLE_CALENDAR_COLOR = "#3b82f6"; // Blue color for timetable

// Day of week mapping: MTWRFS -> RRule day constants
const DAY_MAP: { [key: string]: RRule.Weekday } = {
  M: RRule.MO,
  T: RRule.TU,
  W: RRule.WE,
  R: RRule.TH,
  F: RRule.FR,
  S: RRule.SA,
};

/**
 * Ensure timetable calendar exists
 */
export async function ensureTimetableCalendar(
  db: RxDatabase<CalendarDatabase>,
): Promise<void> {
  const existing = await db.calendars
    .findOne({
      selector: { id: TIMETABLE_CALENDAR_ID },
    })
    .exec();

  if (!existing) {
    await db.calendars.insert({
      id: TIMETABLE_CALENDAR_ID,
      name: TIMETABLE_CALENDAR_NAME,
      color: TIMETABLE_CALENDAR_COLOR,
      description: "Auto-synced from your course timetable",
      isVisible: true,
      source: "timetable",
      lastModified: Date.now(),
    });
  }
}

/**
 * Convert timetable timeslot to calendar event
 */
function timeslotToEvent(
  timeslot: CourseTimeslotData,
  semesterStart: Date,
  semesterEnd: Date,
): {
  title: string;
  description: string;
  location: string;
  startTime: number;
  endTime: number;
  rrule: string;
} {
  const { course, venue, dayOfWeek, startTime, endTime } = timeslot;

  // Get start and end times from scheduleTimeSlots
  const startSlot = scheduleTimeSlots[startTime];
  const endSlot = scheduleTimeSlots[endTime];

  if (!startSlot || !endSlot) {
    throw new Error(`Invalid time slot: ${startTime}-${endTime}`);
  }

  // Parse time strings (format: "HH:MM")
  const [startHour, startMinute] = startSlot.start.split(":").map(Number);
  const [endHour, endMinute] = endSlot.end.split(":").map(Number);

  // Create first occurrence date
  const firstOccurrence = new Date(semesterStart);
  // Find the first day that matches the dayOfWeek
  while (firstOccurrence.getDay() !== dayOfWeek) {
    firstOccurrence.setDate(firstOccurrence.getDate() + 1);
  }
  firstOccurrence.setHours(startHour, startMinute, 0, 0);

  // Create end time for duration calculation
  const eventEnd = new Date(firstOccurrence);
  eventEnd.setHours(endHour, endMinute, 0, 0);

  // Create RRULE for weekly recurrence until semester end
  const weekdayMap: { [key: number]: RRule.Weekday } = {
    0: RRule.SU,
    1: RRule.MO,
    2: RRule.TU,
    3: RRule.WE,
    4: RRule.TH,
    5: RRule.FR,
    6: RRule.SA,
  };

  const rrule = new RRule({
    freq: RRule.WEEKLY,
    byweekday: weekdayMap[dayOfWeek],
    dtstart: firstOccurrence,
    until: semesterEnd,
  });

  return {
    title: course.name_zh || course.name_en || course.course,
    description: `${course.course}\n${course.teacher_zh || course.teacher_en || ""}`,
    location: venue,
    startTime: firstOccurrence.getTime(),
    endTime: eventEnd.getTime(),
    rrule: rrule.toString(),
  };
}

/**
 * Sync timetable courses to calendar
 */
export async function syncTimetableToCalendar(
  db: RxDatabase<CalendarDatabase>,
  timeslots: CourseTimeslotData[],
  semesterStart: Date,
  semesterEnd: Date,
): Promise<void> {
  // Ensure timetable calendar exists
  await ensureTimetableCalendar(db);

  // Get existing timetable events
  const existingEvents = await db.calendar_events
    .find({
      selector: {
        calendarId: TIMETABLE_CALENDAR_ID,
        isDeleted: false,
      },
    })
    .exec();

  // Create a map of existing events by course ID (stored in tags)
  const existingEventMap = new Map(
    existingEvents.map((event) => [event.tags?.[0], event]),
  );

  // Track which events we've processed
  const processedCourseIds = new Set<string>();

  // Sync each timeslot
  for (const timeslot of timeslots) {
    const courseId = timeslot.course.raw_id;
    processedCourseIds.add(courseId);

    const eventData = timeslotToEvent(timeslot, semesterStart, semesterEnd);
    const existingEvent = existingEventMap.get(courseId);

    if (existingEvent) {
      // Update existing event if changed
      const hasChanged =
        existingEvent.title !== eventData.title ||
        existingEvent.location !== eventData.location ||
        existingEvent.rrule !== eventData.rrule;

      if (hasChanged) {
        await existingEvent.patch({
          ...eventData,
          lastModified: Date.now(),
        });
      }
    } else {
      // Create new event
      await db.calendar_events.insert({
        id: `timetable-${courseId}-${Date.now()}`,
        calendarId: TIMETABLE_CALENDAR_ID,
        ...eventData,
        isAllDay: false,
        tags: [courseId], // Store course ID in tags for tracking
        isDeleted: false,
        lastModified: Date.now(),
      });
    }
  }

  // Delete events for courses no longer in timetable
  for (const [courseId, event] of existingEventMap.entries()) {
    if (!processedCourseIds.has(courseId)) {
      await event.patch({
        isDeleted: true,
        lastModified: Date.now(),
      });
    }
  }
}

/**
 * Clear all timetable events (for reset)
 */
export async function clearTimetableEvents(
  db: RxDatabase<CalendarDatabase>,
): Promise<void> {
  const events = await db.calendar_events
    .find({
      selector: {
        calendarId: TIMETABLE_CALENDAR_ID,
        isDeleted: false,
      },
    })
    .exec();

  for (const event of events) {
    await event.patch({
      isDeleted: true,
      lastModified: Date.now(),
    });
  }
}
