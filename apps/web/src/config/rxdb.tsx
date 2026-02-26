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
  // create RxDB
  if (import.meta.env.DEV) {
    await import("rxdb/plugins/dev-mode").then((module) =>
      addRxPlugin(module.RxDBDevModePlugin),
    );
  }
  addRxPlugin(RxDBMigrationPlugin);
  addRxPlugin(RxDBStatePlugin);
  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBUpdatePlugin);

  const storage = import.meta.env.DEV
    ? wrappedValidateZSchemaStorage({
        storage: getRxStorageDexie(),
      })
    : getRxStorageDexie();
  const db = await createRxDatabase({
    name: "nthumods-calendar",
    storage: storage,
    ignoreDuplicate: import.meta.env.DEV,
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
  });

  return db;
};

export const RxDBProvider: FC<PropsWithChildren> = ({ children }) => {
  const [db, setDb] = useState<Awaited<ReturnType<typeof initializeRxDB>>>();

  useEffect(() => {
    initializeRxDB().then(setDb);
  }, []);

  return <Provider db={db}>{children}</Provider>;
};
