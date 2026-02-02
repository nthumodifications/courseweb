"use client";
import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  toTypedRxJsonSchema,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { Provider } from "rxdb-hooks";
import { FC, PropsWithChildren, useEffect, useState } from "react";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration-schema";
import { RxDBStatePlugin } from "rxdb/plugins/state";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { v4 as uuidv4 } from "uuid";
import { wrappedValidateZSchemaStorage } from "rxdb/plugins/validate-z-schema";
import { calendarEventsSchemaV0, calendarsSchemaV0 } from "./rxdb-calendar-v2";

// Singleton database instance to prevent multiple instances during hot reload
let dbInstance: Awaited<ReturnType<typeof createRxDatabase>> | null = null;
let dbPromise: Promise<Awaited<ReturnType<typeof createRxDatabase>>> | null =
  null;

// create collection based on CalendarEvent
const eventsSchema = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
    },
    details: {
      type: ["string"],
    },
    location: {
      type: ["string"],
    },
    allDay: {
      type: "boolean",
    },
    start: {
      type: "string",
      format: "date-time",
    },
    end: {
      type: "string",
      format: "date-time",
    },
    actualEnd: {
      type: ["string", "null"],
      format: "date-time",
    },
    repeat: {
      type: ["object", "null"],
      properties: {
        type: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "yearly"],
        },
        interval: {
          type: "number",
        },
        mode: {
          type: "string",
          enum: ["count", "date"],
        },
        value: {
          type: "number",
        },
      },
    },
    color: {
      type: ["string"],
    },
    tag: {
      type: ["string"],
    },
    excludedDates: {
      type: "array",
      items: {
        type: "string",
        format: "date-time",
      },
    },
    parentId: {
      type: ["string"],
    },
  },
  required: [
    "id",
    "title",
    "allDay",
    "start",
    "end",
    "repeat",
    "color",
    "tag",
    "actualEnd",
  ],
} as const;
const schemaTyped = toTypedRxJsonSchema(eventsSchema);

export type EventDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

const timetableSyncSchema = {
  version: 0,
  primaryKey: "semester",
  type: "object",
  properties: {
    semester: {
      type: "string",
      maxLength: 5,
    },
    lastSync: {
      type: "string",
      format: "date-time",
    },
    courses: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["semester", "lastSync", "courses"],
} as const;

const timetableSyncSchemaTyped = toTypedRxJsonSchema(timetableSyncSchema);

export type TimetableSyncDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof timetableSyncSchemaTyped
>;
export const initializeRxDB = async () => {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing promise if initialization is in progress
  if (dbPromise) {
    return dbPromise;
  }

  // Create new instance
  dbPromise = (async () => {
    // create RxDB
    if (process.env.NODE_ENV === "development") {
      await import("rxdb/plugins/dev-mode").then((module) =>
        addRxPlugin(module.RxDBDevModePlugin),
      );
    }
    addRxPlugin(RxDBMigrationPlugin);
    addRxPlugin(RxDBStatePlugin);
    addRxPlugin(RxDBQueryBuilderPlugin);
    addRxPlugin(RxDBUpdatePlugin);

    const storage =
      process.env.NODE_ENV === "development"
        ? wrappedValidateZSchemaStorage({
            storage: getRxStorageDexie(),
          })
        : getRxStorageDexie();
    // Try to remove existing database first in development
    if (process.env.NODE_ENV === "development") {
      try {
        await removeRxDatabase("nthumods-calendar", storage);
        console.log("[RxDB] Removed existing database");
      } catch (e) {
        // Database doesn't exist, that's fine
      }
    }

    const db = await createRxDatabase({
      name: "nthumods-calendar",
      storage: storage,
      ignoreDuplicate: true,
      // Add global options to handle replication protocol metadata
      options: {
        replication: {
          metaInstanceFactory: (docData: any) => {
            // Ensure _meta is always a valid object with lwt when used in replication
            if (!docData._meta || docData._meta === null) {
              docData._meta = { lwt: Date.now() };
            }
            return docData;
          },
        },
      },
    });

    await db.addCollections({
      // Old events collection - kept for migration compatibility
      events: {
        schema: eventsSchema,
        migrationStrategies: {
          1: (oldDoc) => {
            console.log("Migrating document:", oldDoc.id, oldDoc);

            try {
              // Special handling for replication protocol documents
              if (oldDoc.isCheckpoint && oldDoc.itemId) {
                console.log(
                  "Found replication protocol document, ensuring proper structure",
                );
                // This is a replication protocol document
                if (oldDoc.docData) {
                  // Fix nested _meta
                  if (!oldDoc.docData._meta || oldDoc.docData._meta === null) {
                    oldDoc.docData._meta = {
                      lwt: Math.min(Math.max(Date.now(), 1), 1000000000000000),
                    };
                  }

                  // Add any missing required fields in docData to avoid validation errors
                  oldDoc.docData.excludedDates = Array.isArray(
                    oldDoc.docData.excludedDates,
                  )
                    ? oldDoc.docData.excludedDates
                    : [];
                  oldDoc.docData.parentId = oldDoc.docData.parentId || "";
                  oldDoc.docData.details = oldDoc.docData.details || "";
                }

                return oldDoc;
              }

              // Regular document handling
              if (oldDoc.docData && typeof oldDoc.docData === "object") {
                console.log(
                  "Document has docData structure, handling validation issues",
                );

                // Always ensure docData._meta is properly initialized with required lwt property
                const timestamp = Date.now();
                oldDoc.docData._meta = {
                  lwt: Math.min(Math.max(timestamp, 1), 1000000000000000),
                };

                // Ensure other required fields are present
                oldDoc.docData.excludedDates = Array.isArray(
                  oldDoc.docData.excludedDates,
                )
                  ? oldDoc.docData.excludedDates
                  : [];

                oldDoc.docData.parentId = oldDoc.docData.parentId || "";
                oldDoc.docData.details = oldDoc.docData.details || "";

                // Remove any nested docData that might be causing issues
                if (oldDoc.docData.docData) {
                  console.log(
                    "Found nested docData.docData, removing to avoid validation errors",
                  );
                  delete oldDoc.docData.docData;
                }
              }

              // Handle root-level properties
              if (!oldDoc._meta || oldDoc._meta === null) {
                const timestamp = Date.now();
                oldDoc._meta = {
                  lwt: Math.min(Math.max(timestamp, 1), 1000000000000000),
                };
              }

              // Ensure other required fields are present at the root level
              oldDoc.excludedDates = Array.isArray(oldDoc.excludedDates)
                ? oldDoc.excludedDates
                : [];

              oldDoc.parentId = oldDoc.parentId || "";
              oldDoc.details = oldDoc.details || "";

              console.log("Migration completed for document:", oldDoc.id);

              return oldDoc;
            } catch (error) {
              console.error(
                "Error during migration of document:",
                oldDoc.id,
                error,
              );

              // Even if there's an error, try to return a minimally valid document
              if (oldDoc.docData && typeof oldDoc.docData === "object") {
                oldDoc.docData._meta = { lwt: Date.now() };
              }
              if (!oldDoc._meta || oldDoc._meta === null) {
                oldDoc._meta = { lwt: Date.now() };
              }

              return oldDoc;
            }
          },
        },
      },
      timetablesync: {
        schema: timetableSyncSchema,
      },
      // New calendar v2 collections
      calendar_events: {
        schema: calendarEventsSchemaV0,
        migrationStrategies: {
          // v0 to v1: Ensure all required fields exist
          1: (oldDoc: any) => {
            console.log("[Migration] v0->v1 calendar_event:", oldDoc.id);

            // Set default source if missing or invalid
            if (
              !oldDoc.source ||
              !["user", "timetable", "import"].includes(oldDoc.source)
            ) {
              oldDoc.source = "user";
            }

            // Rename deleted to isDeleted if it exists
            if (oldDoc.deleted !== undefined) {
              oldDoc.isDeleted = oldDoc.deleted;
              delete oldDoc.deleted;
            }

            // Ensure required fields exist
            if (typeof oldDoc.isDeleted !== "boolean") {
              oldDoc.isDeleted = false;
            }

            if (typeof oldDoc.lastModified !== "number") {
              oldDoc.lastModified = Date.now();
            }

            if (typeof oldDoc.timezone !== "string" || !oldDoc.timezone) {
              oldDoc.timezone = "Asia/Taipei";
            }

            return oldDoc;
          },
          // v1 to v2: Ensure isDeleted is set (in case v1 didn't convert it)
          2: (oldDoc: any) => {
            console.log("[Migration] v1->v2 calendar_event:", oldDoc.id);

            // Handle any old deleted field
            if (
              oldDoc.deleted !== undefined &&
              oldDoc.isDeleted === undefined
            ) {
              oldDoc.isDeleted = oldDoc.deleted;
            }
            delete oldDoc.deleted;

            if (typeof oldDoc.isDeleted !== "boolean") {
              oldDoc.isDeleted = false;
            }

            return oldDoc;
          },
          // v2 to v3: Ensure source field is required
          3: (oldDoc: any) => {
            console.log("[Migration] v2->v3 calendar_event:", oldDoc.id);

            // Ensure source field exists
            if (
              !oldDoc.source ||
              !["user", "timetable", "import"].includes(oldDoc.source)
            ) {
              oldDoc.source = "user";
            }

            return oldDoc;
          },
          // v3 to v4: Simplified indexes
          4: (oldDoc: any) => {
            console.log("[Migration] v3->v4 calendar_event:", oldDoc.id);

            // Ensure all required fields are set
            if (!oldDoc.source) oldDoc.source = "user";
            if (typeof oldDoc.isDeleted !== "boolean") oldDoc.isDeleted = false;

            return oldDoc;
          },
          // v4 to v5: Final cleanup
          5: (oldDoc: any) => {
            console.log("[Migration] v4->v5 calendar_event:", oldDoc.id);
            return oldDoc;
          },
        },
      },
      calendars: {
        schema: calendarsSchemaV0,
        migrationStrategies: {
          // v0 to v1: Ensure all required fields exist
          1: (oldDoc: any) => {
            console.log("[Migration] v0->v1 calendar:", oldDoc.id);

            // Set default source if missing
            if (
              !oldDoc.source ||
              !["user", "timetable", "subscription"].includes(oldDoc.source)
            ) {
              oldDoc.source = "user";
            }

            // Rename deleted to isDeleted if it exists
            if (oldDoc.deleted !== undefined) {
              oldDoc.isDeleted = oldDoc.deleted;
              delete oldDoc.deleted;
            }

            // Ensure required fields exist
            if (typeof oldDoc.isDeleted !== "boolean") {
              oldDoc.isDeleted = false;
            }

            if (typeof oldDoc.lastModified !== "number") {
              oldDoc.lastModified = Date.now();
            }

            return oldDoc;
          },
          // v1 to v2: Ensure isDeleted is set (in case v1 didn't convert it)
          2: (oldDoc: any) => {
            console.log("[Migration] v1->v2 calendar:", oldDoc.id);

            // Handle any old deleted field
            if (
              oldDoc.deleted !== undefined &&
              oldDoc.isDeleted === undefined
            ) {
              oldDoc.isDeleted = oldDoc.deleted;
            }
            delete oldDoc.deleted;

            if (typeof oldDoc.isDeleted !== "boolean") {
              oldDoc.isDeleted = false;
            }

            return oldDoc;
          },
          // v2 to v3: Ensure source field is required
          3: (oldDoc: any) => {
            console.log("[Migration] v2->v3 calendar:", oldDoc.id);

            // Ensure source field exists
            if (
              !oldDoc.source ||
              !["user", "timetable", "subscription"].includes(oldDoc.source)
            ) {
              oldDoc.source = "user";
            }

            return oldDoc;
          },
          // v3 to v4: Simplified indexes
          4: (oldDoc: any) => {
            console.log("[Migration] v3->v4 calendar:", oldDoc.id);

            // Ensure all required fields are set
            if (!oldDoc.source) oldDoc.source = "user";
            if (typeof oldDoc.isDeleted !== "boolean") oldDoc.isDeleted = false;

            return oldDoc;
          },
          // v4 to v5: Final cleanup
          5: (oldDoc: any) => {
            console.log("[Migration] v4->v5 calendar:", oldDoc.id);
            return oldDoc;
          },
        },
      },
    });

    dbInstance = db;
    return db;
  })();

  return dbPromise;
};

export const RxDBProvider: FC<PropsWithChildren> = ({ children }) => {
  const [db, setDb] = useState<Awaited<ReturnType<typeof initializeRxDB>>>();

  useEffect(() => {
    initializeRxDB().then(setDb);
  }, []);

  return <Provider db={db}>{children}</Provider>;
};
