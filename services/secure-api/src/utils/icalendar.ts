import ical from "ical-generator";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { getPrismaClient } from "./apiKeyValidation";

const CALENDAR_TIME_ZONE = "Asia/Taipei";
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;

type ICalDateAdapter = {
  isValid: true;
  toJSDate: () => Date;
  setZone: () => ICalDateAdapter;
  toFormat: (format: string) => string;
  zone: { type: string };
};

const taipeiDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return values as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    string
  >;
};

/** Give ical-generator timezone-aware wall-clock fields without server-TZ drift. */
const toTaipeiICalDate = (date: Date): ICalDateAdapter => {
  const parts = taipeiDateParts(date);
  return {
    isValid: true,
    toJSDate: () => date,
    setZone: () => toTaipeiICalDate(date),
    zone: { type: "iana" },
    toFormat: (format) => {
      if (format === "yyyyLLdd") {
        return `${parts.year}${parts.month}${parts.day}`;
      }
      if (format === "HHmmss") {
        return `${parts.hour}${parts.minute}${parts.second}`;
      }
      throw new Error(`Unsupported iCalendar date format: ${format}`);
    },
  };
};

const taipeiDateOnly = (date: Date) =>
  toTaipeiICalDate(date).toFormat("yyyyLLdd");

/** An inclusive Taipei date-rule cutoff expressed as a UTC date-time. */
const taipeiDateRuleUntil = (date: Date) => {
  const parts = taipeiDateParts(date);
  const nextTaipeiMidnight = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + 1,
  );
  return new Date(nextTaipeiMidnight - TAIPEI_OFFSET_MS - 1000);
};

const allDayRepeatingRule = (event: any) => {
  const repeat = event.repeat;
  const rule = [`RRULE:FREQ=${repeat.type.toUpperCase()}`];
  if (repeat.mode === "count") {
    rule.push(`COUNT=${repeat.value}`);
  } else if (repeat.value) {
    rule.push(`UNTIL=${taipeiDateOnly(new Date(repeat.value))}`);
  }
  rule.push(`INTERVAL=${repeat.interval || 1}`);

  const excludedDates = event.excludedDates?.length
    ? event.excludedDates
        .map((date: string) => taipeiDateOnly(new Date(date)))
        .join(",")
    : undefined;

  return [rule.join(";"), excludedDates && `EXDATE;VALUE=DATE:${excludedDates}`]
    .filter(Boolean)
    .join("\r\n");
};

/**
 * Create an iCalendar file for a user's calendar
 *
 * @param userId The user ID
 * @param includeFullDetails Whether to include full event details or basic info only
 * @param context Context object for Firebase initialization
 * @param prismaOverride Optional Prisma client override for testing
 * @param firebaseOverride Optional Firebase admin override for testing
 * @returns iCalendar string
 */
export async function createICalendar(
  userId: string,
  includeFullDetails: boolean,
  context?: any,
  prismaOverride?: any,
  firebaseOverride?: any,
  now = new Date(),
): Promise<string> {
  try {
    // Use the provided prisma client or get the default one
    const prisma = prismaOverride || getPrismaClient();

    // Find the user
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      console.error(`User with ID ${userId} not found when creating iCalendar`);
      throw new Error(`User with ID ${userId} not found`);
    }

    const calendar = ical({
      name: `${user.name}'s Calendar`,
      prodId: { company: "NTHUMods", product: "Calendar" },
      timezone: "UTC",
    });

    // Connect to Firebase Firestore for calendar events
    // Set up date range for querying events - looking 6 months ahead
    const currentDate = now;
    const sixMonthsFromNow = new Date(
      currentDate.getTime() + 180 * 24 * 60 * 60 * 1000,
    );

    // Initialize Firebase admin with override for testing if provided
    const { adminFirestore } = firebaseOverride || getFirebaseAdmin(context);
    const eventsRef = adminFirestore
      .collection("users")
      .doc(userId)
      .collection("events");

    // Optimize Firebase query with proper indexing. actualEnd is the last
    // materialized occurrence for repeated events (and the event end for
    // one-off events), so querying end would drop long-running series whose
    // root occurrence is already in the past.
    let eventsSnapshot;
    try {
      eventsSnapshot = await eventsRef
        .where("start", "<=", sixMonthsFromNow.toISOString())
        .where("actualEnd", ">=", currentDate.toISOString())
        .orderBy("start", "asc")
        .limit(100) // Reasonable limit for calendar exports
        .get();
    } catch (firebaseError) {
      console.error(`Firebase query error for user ${userId}:`, firebaseError);
      // Continue with empty events to serve at least a basic calendar
      eventsSnapshot = { docs: [], empty: true };
    } // Convert Firebase documents to event objects
    const events = eventsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      };
    });

    // Process all events (if any)
    if (events.length > 0) {
      // Process the events
      for (const event of events as any[]) {
        try {
          // Parse dates properly (Firebase stores them as ISO strings)
          const eventStart =
            typeof event.start === "string"
              ? new Date(event.start)
              : event.start;
          const eventEnd =
            typeof event.end === "string" ? new Date(event.end) : event.end;

          // Create the event with the appropriate details based on includeFullDetails
          calendar.createEvent({
            id: event.id,
            stamp: currentDate,
            start: event.allDay
              ? (toTaipeiICalDate(eventStart) as any)
              : eventStart,
            end: event.allDay
              ? (toTaipeiICalDate(
                  new Date(eventEnd.getTime() + CALENDAR_DAY_MS),
                ) as any)
              : eventEnd,
            summary: event.title,
            description: includeFullDetails ? event.details : undefined,
            location: includeFullDetails ? event.location : undefined,
            allDay: !!event.allDay,
            // Handle recurring events based on the repeat property
            ...(event.repeat?.type && {
              repeating: event.allDay
                ? allDayRepeatingRule(event)
                : {
                    freq: event.repeat.type.toUpperCase(),
                    interval: event.repeat.interval || 1,
                    ...(event.repeat.mode === "count"
                      ? { count: event.repeat.value }
                      : {
                          until: event.repeat.value
                            ? taipeiDateRuleUntil(new Date(event.repeat.value))
                            : undefined,
                        }),
                    exclude: event.excludedDates?.length
                      ? event.excludedDates.map((d: string) => new Date(d))
                      : undefined,
                  },
            }),
          });
        } catch (err) {
          console.error("Error processing event:", event.id, err);
          // Skip this event but continue with others
        }
      }
    }

    // Return the calendar as a string
    return calendar.toString();
  } catch (error) {
    console.error("Error creating iCalendar:", error);
    // Propagate the original error instead of creating a new one
    throw error;
  }
}
