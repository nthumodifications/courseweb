import ical from "ical-generator";
import { addDays } from "date-fns";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { getPrismaClient } from "./apiKeyValidation";

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
      timezone: "Asia/Taipei",
    });

    // Connect to Firebase Firestore for calendar events
    // Set up date range for querying events - looking 6 months ahead
    const currentDate = new Date();
    const sixMonthsFromNow = addDays(currentDate, 180);

    // Initialize Firebase admin with override for testing if provided
    const { adminFirestore } = firebaseOverride || getFirebaseAdmin(context);
    const eventsRef = adminFirestore
      .collection("users")
      .doc(userId)
      .collection("events");

    // Optimize Firebase query with proper indexing
    // Using composite index on start+end for efficient date range filtering
    let eventsSnapshot;
    try {
      eventsSnapshot = await eventsRef
        .where("start", "<=", sixMonthsFromNow.toISOString())
        .where("end", ">=", currentDate.toISOString())
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
            start: eventStart,
            end: eventEnd,
            summary: event.title,
            description: includeFullDetails ? event.details : undefined,
            location: includeFullDetails ? event.location : undefined,
            allDay: !!event.allDay,
            // Handle recurring events based on the repeat property
            ...(event.repeat &&
              event.repeat.type && {
                repeating: {
                  freq: event.repeat.type.toUpperCase(),
                  interval: event.repeat.interval || 1,
                  until: event.repeat.value
                    ? new Date(event.repeat.value)
                    : undefined,
                  exclude: event.excludedDates
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
