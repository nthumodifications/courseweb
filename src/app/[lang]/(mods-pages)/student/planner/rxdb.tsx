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

const foldersSchema = {
  version: 0,
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
    parent: {
      type: ["string", "null"],
    },
    min: {
      type: "number",
    },
    max: {
      type: "number",
    },
    metric: {
      type: "string",
      enum: ["credits", "courses"],
    },
    requireChildValidation: {
      type: "boolean",
    },
    titlePlacement: {
      type: "string",
    },
    order: {
      type: "number",
    },
    color: {
      type: "string",
    },
    expanded: {
      type: "boolean",
    },
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

const itemsSchema = {
  version: 0,
  primaryKey: "uuid",
  type: "object",
  properties: {
    uuid: {
      // uuid for each item, key
      type: "string",
      maxLength: 100,
    },
    id: {
      //course id ish CS123456
      type: "string",
    },
    title: {
      // course name
      type: "string",
    },
    parent: {
      // folder id
      type: ["string", "null"],
    },
    credits: {
      // course credits
      type: "number",
    },
    raw_id: {
      // reference course id to the course database, optional
      type: "string",
    },
    semester: {
      // 11310, 11320, etc
      type: "string",
    },
    status: {
      // enum
      type: "string",
    },
    description: {
      type: "string",
    },
    comments: {
      type: "string",
    },
    instructor: {
      type: "string",
    },
    dependson: {
      type: "array",
      items: {
        type: "string",
      },
    },
    order: {
      // order of the item in the folder
      type: "number",
    },
  },
  required: ["uuid", "id", "title", "parent", "credits", "order"],
} as const;

const plannerDataSchema = {
  version: 0,
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
    department: {
      type: "string",
    },
    requiredCredits: {
      type: "number",
    },
    enrollmentYear: {
      type: "string",
    },
    graduationYear: {
      type: "string",
    },
    includedSemesters: {
      type: "array",
      items: {
        type: "string",
      },
    },
    description: {
      type: "string",
    },
    createdAt: {
      type: "string",
      format: "date-time",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
    },
  },
  required: [
    "id",
    "title",
    "department",
    "requiredCredits",
    "enrollmentYear",
    "graduationYear",
    "includedSemesters",
    "createdAt",
    "updatedAt",
  ],
} as const;

const semesterSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    name: {
      type: "string",
    },
    status: {
      type: "string",
      enum: ["completed", "in-progress", "planned"],
    },
    year: {
      type: "string",
    },
    term: {
      type: "string",
    },
    startDate: {
      type: "string",
      format: "date-time",
    },
    endDate: {
      type: "string",
      format: "date-time",
    },
    isActive: {
      type: "boolean",
    },
    order: {
      type: "number",
    },
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

  const db = await createRxDatabase({
    name: "grad-planner",
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    folders: {
      schema: foldersSchema,
    },
    items: {
      schema: itemsSchema,
    },
    plannerdata: {
      schema: plannerDataSchema,
    },
    semesters: {
      schema: semesterSchema,
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
