import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  addRxPlugin,
  createRxDatabase,
  toTypedRxJsonSchema,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { Provider } from "rxdb-hooks";
import { FC, PropsWithChildren, useEffect, useRef, useState } from "react";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration-schema";
import { RxDBStatePlugin } from "rxdb/plugins/state";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { wrappedValidateZSchemaStorage } from "rxdb/plugins/validate-z-schema";
import { useAuth } from "react-oidc-context";

export const ANONYMOUS_CALENDAR_DATABASE_NAME = "nthumods-calendar";

/**
 * RxDB names and replication metadata are deliberately derived from the OIDC
 * subject. A stable 64-bit hash keeps the subject out of IndexedDB names and
 * avoids invalid database-name characters while remaining stable across
 * sessions.
 */
export const getCalendarDatabaseName = (subject?: string | null) => {
  if (!subject) return ANONYMOUS_CALENDAR_DATABASE_NAME;

  let firstHash = 2166136261;
  let secondHash = 2246822519;
  for (let index = 0; index < subject.length; index += 1) {
    const code = subject.charCodeAt(index);
    firstHash = Math.imul(firstHash ^ code, 16777619);
    secondHash = Math.imul(secondHash ^ (code + index), 16777619);
  }

  return `${ANONYMOUS_CALENDAR_DATABASE_NAME}-${(firstHash >>> 0).toString(16).padStart(8, "0")}${(secondHash >>> 0).toString(16).padStart(8, "0")}`;
};

export const hasCalendarScope = (scope?: string | null) =>
  typeof scope === "string" && scope.split(/\s+/).includes("calendar");

const DEFAULT_EVENT_COLOR = "#3b82f6";
const DEFAULT_EVENT_TAG = "Event";
const DEFAULT_EVENT_DATE = new Date(0).toISOString();

type MigrationDocument = Record<string, any>;

const toDateTimeString = (value: unknown, fallback: string) => {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null;
  if (date && !Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  return fallback;
};

const migrateEventDocument = (
  oldDoc: MigrationDocument,
  includeCourseId: boolean,
) => {
  const migrated = { ...oldDoc };
  migrated.id =
    typeof migrated.id === "string" && migrated.id.length > 0
      ? migrated.id
      : "migrated-event";
  migrated.title =
    typeof migrated.title === "string" ? migrated.title : DEFAULT_EVENT_TAG;
  migrated.allDay =
    typeof migrated.allDay === "boolean" ? migrated.allDay : false;
  migrated.start = toDateTimeString(migrated.start, DEFAULT_EVENT_DATE);
  migrated.end = toDateTimeString(migrated.end, migrated.start);
  migrated.repeat =
    migrated.repeat === null ||
    (typeof migrated.repeat === "object" && !Array.isArray(migrated.repeat))
      ? migrated.repeat
      : null;
  migrated.color =
    typeof migrated.color === "string" && migrated.color.length > 0
      ? migrated.color
      : DEFAULT_EVENT_COLOR;
  migrated.tag =
    typeof migrated.tag === "string" && migrated.tag.length > 0
      ? migrated.tag
      : DEFAULT_EVENT_TAG;
  migrated.actualEnd =
    migrated.actualEnd === null
      ? null
      : toDateTimeString(migrated.actualEnd, migrated.end);
  migrated.details =
    typeof migrated.details === "string" ? migrated.details : "";
  migrated.excludedDates = Array.isArray(migrated.excludedDates)
    ? migrated.excludedDates
        .map((date: unknown) => toDateTimeString(date, ""))
        .filter((date: string) => date.length > 0)
    : [];
  migrated.parentId =
    typeof migrated.parentId === "string" ? migrated.parentId : "";

  if (includeCourseId) {
    migrated.courseId =
      typeof migrated.courseId === "string" ? migrated.courseId : null;
  } else {
    delete migrated.courseId;
  }

  return migrated;
};

/** Pure migration helper, exported so the versioned backfill is testable. */
export const migrateEventToV2 = (oldDoc: MigrationDocument) =>
  migrateEventDocument(oldDoc, true);

const migrateEventToV1 = (oldDoc: MigrationDocument) =>
  migrateEventDocument(oldDoc, false);

// Create collection based on CalendarEvent.
const eventsSchema = {
  version: 2,
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
    courseId: {
      type: ["string", "null"],
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
    "courseId",
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
export const initializeRxDB = async (
  databaseName = ANONYMOUS_CALENDAR_DATABASE_NAME,
) => {
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
    name: databaseName,
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
        1: migrateEventToV1,
        2: migrateEventToV2,
      },
    },
    timetablesync: {
      schema: timetableSyncSchema,
    },
  });

  return db;
};

export const RxDBProvider: FC<PropsWithChildren> = ({ children }) => {
  const auth = useAuth();
  const subject = auth.isAuthenticated ? auth.user?.profile.sub : null;
  const databaseName = getCalendarDatabaseName(subject);
  const [databaseState, setDatabaseState] = useState<{
    name: string;
    db: Awaited<ReturnType<typeof initializeRxDB>>;
  }>();
  const databaseRef = useRef<Awaited<ReturnType<typeof initializeRxDB>>>();
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let active = true;

    setDatabaseState(undefined);
    const previousDb = databaseRef.current;
    databaseRef.current = undefined;
    if (previousDb) void previousDb.close();

    void initializeRxDB(databaseName).then((db) => {
      if (!active || generationRef.current !== generation) {
        void db.close();
        return;
      }
      databaseRef.current = db;
      setDatabaseState({ name: databaseName, db });
    });

    return () => {
      active = false;
      if (databaseRef.current?.name === databaseName) {
        const db = databaseRef.current;
        databaseRef.current = undefined;
        void db.close();
      }
    };
  }, [databaseName]);

  const db =
    databaseState?.name === databaseName ? databaseState.db : undefined;

  // Unmount consumers while the identity transition is in flight. This
  // prevents one account's collection from remaining visible for a render.
  return <Provider db={db}>{db ? children : null}</Provider>;
};
