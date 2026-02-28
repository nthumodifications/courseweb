import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  addRxPlugin,
  createRxDatabase,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { Provider } from "rxdb-hooks";
import { FC, PropsWithChildren, useEffect, useState } from "react";
import { RxDBStatePlugin } from "rxdb/plugins/state";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { wrappedValidateZSchemaStorage } from "rxdb/plugins/validate-z-schema";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";

// FOLDERS (version 2 → bumped from 1 ⇒ 2)
const foldersSchema = {
  version: 2,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    title: { type: "string" },
    parent: { type: ["string", "null"] },
    min: { type: "number" },
    max: { type: "number" },
    metric: { type: "string", enum: ["credits", "courses"] },
    requireChildValidation: { type: "boolean" },
    titlePlacement: { type: "string" },
    order: { type: "number" },
    color: { type: ["string", "null"] },
    expanded: { type: ["boolean", "null"] },
  },
  required: [
    "id",
    "title",
    "parent",
    "min",
    "max",
    "metric",
    "requireChildValidation",
    "titlePlacement",
    "order",
  ],
} as const;

// ITEMS (version 2 → bumped from 1 ⇒ 2)
const itemsSchema = {
  version: 2,
  primaryKey: "uuid",
  type: "object",
  properties: {
    uuid: { type: "string", maxLength: 100 },
    id: { type: "string" },
    title: { type: "string" },
    parent: { type: ["string", "null"] },
    credits: { type: "number" },
    raw_id: { type: ["string", "null"] },
    semester: { type: ["string", "null"] },
    status: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    comments: { type: ["string", "null"] },
    instructor: { type: ["string", "null"] },
    dependson: { type: ["array", "null"], items: { type: "string" } },
    order: { type: "number" },
  },
  required: ["uuid", "id", "title", "parent", "credits", "order"],
} as const;

// PLANNER DATA (version 3 → bumped from 2 ⇒ 3)
const plannerDataSchema = {
  version: 3,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    title: { type: "string" },
    department: { type: "string" },
    requiredCredits: { type: "number" },
    enrollmentYear: { type: "string" },
    graduationYear: { type: "string" },
    includedSemesters: { type: "array", items: { type: "string" } },
    description: { type: ["string", "null"] },
  },
  required: [
    "id",
    "title",
    "department",
    "requiredCredits",
    "enrollmentYear",
    "graduationYear",
    "includedSemesters",
  ],
} as const;

// SEMESTERS (version 2 → bumped from 1 ⇒ 2)
const semesterSchema = {
  version: 3,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    status: { type: "string", enum: ["completed", "in-progress", "planned"] },
    year: { type: "string" },
    term: { type: "string" },
    startDate: { type: ["string", "null"], format: "date" },
    endDate: { type: ["string", "null"], format: "date" },
    isActive: { type: "boolean" },
    order: { type: ["number", "null"] },
  },
  required: ["id", "name", "status", "year", "term", "isActive"],
} as const;

export type FolderDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof foldersSchema
>;
export type ItemDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof itemsSchema
>;
export type PlannerDataDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof plannerDataSchema
>;
export type SemesterDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof semesterSchema
>;

export const initializeRxDB = async () => {
  if (import.meta.env.DEV) {
    await import("rxdb/plugins/dev-mode").then((m) =>
      addRxPlugin(m.RxDBDevModePlugin),
    );
  }
  addRxPlugin(RxDBMigrationSchemaPlugin);
  addRxPlugin(RxDBStatePlugin);
  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBUpdatePlugin);

  const storage = import.meta.env.DEV
    ? wrappedValidateZSchemaStorage({
        storage: getRxStorageDexie(),
      })
    : getRxStorageDexie();
  const db = await createRxDatabase({
    name: "grad-planner",
    storage,
    ignoreDuplicate: import.meta.env.DEV,
  });

  await db.addCollections({
    folders: {
      schema: foldersSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
        2: (oldDoc) => oldDoc,
      },
    },
    items: {
      schema: itemsSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
        2: (oldDoc) => oldDoc,
      },
    },
    plannerdata: {
      schema: plannerDataSchema,
      migrationStrategies: {
        // migrate from v1 → v2
        1: (oldDoc) => {
          delete (oldDoc as any).updatedAt;
          delete (oldDoc as any).createdAt;
          return oldDoc;
        },
        2: (oldDoc) => oldDoc,
        3: (oldDoc) => oldDoc,
      },
    },
    semesters: {
      schema: semesterSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
        2: (oldDoc) => oldDoc,
        3: (oldDoc) => oldDoc,
      },
    },
  });

  return db;
};

export const PlannerDBProvider: FC<PropsWithChildren> = ({ children }) => {
  const [db, setDb] = useState<Awaited<ReturnType<typeof initializeRxDB>>>();
  useEffect(() => {
    initializeRxDB().then(setDb);
  }, []);
  return <Provider db={db}>{children}</Provider>;
};
