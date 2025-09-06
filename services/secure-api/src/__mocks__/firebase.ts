// Common mock for all Firebase related functionality
import { mock } from "bun:test";

// Default mock implementations
export const mockFirebaseGet = mock(() =>
  Promise.resolve({
    docs: [
      // Regular time-to-time event (same day)
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
      // All-day single day event
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
      // All-day multi-day event
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
      // Weekly repeating event
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
      // Monthly repeating event
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
      // Daily repeating event
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
      // Yearly repeating event
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

// Mock the collection chain methods
export const mockCollection = () => ({
  doc: () => ({
    collection: () => ({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              get: mockFirebaseGet,
            }),
          }),
        }),
      }),
    }),
  }),
});

// Mock the Firebase admin
export const mockFirebaseAdmin = () => ({
  adminFirestore: {
    collection: mockCollection,
  },
});

// Mock the getFirebaseAdmin function
export const mockGetFirebaseAdmin = mock(() => mockFirebaseAdmin());

export default {
  mockFirebaseGet,
  mockCollection,
  mockFirebaseAdmin,
  mockGetFirebaseAdmin,
};
