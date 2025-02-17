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

// create collection based on CalendarEvent
const eventsSchema = {
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
    details: {
      type: "string",
    },
    location: {
      type: "string",
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
      type: "object",
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
      type: "string",
    },
    tag: {
      type: "string",
    },
    excludedDates: {
      type: "array",
      items: {
        type: "string",
        format: "date-time",
      },
    },
    parentId: {
      type: "string",
    },
  },
  required: [
    "id",
    "title",
    "allDay",
    "start",
    "end",
    "displayEnd",
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

const foldersSchema = {
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
    parent: {
      type: ["string", "null"],
    },
    credits: {
      type: "number",
    },
    order: {
      type: "number",
    },
  },
  required: ["id", "title", "parent", "credits", "order"],
} as const;

export type FolderDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof foldersSchema
>;

export type ItemDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof itemsSchema
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
  if (process.env.NODE_ENV === "development") {
    await import("rxdb/plugins/dev-mode").then((module) =>
      addRxPlugin(module.RxDBDevModePlugin),
    );
  }
  addRxPlugin(RxDBMigrationPlugin);
  addRxPlugin(RxDBStatePlugin);
  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBUpdatePlugin);

  // removeRxDatabase('nthumods-calendar', getRxStorageDexie());
  const db = await createRxDatabase({
    name: "nthumods-calendar",
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    events: {
      schema: eventsSchema,
    },
    folders: {
      schema: foldersSchema,
      migrationStrategies: {
        1: (oldDoc: any) => {
          oldDoc.order = 0;
          return oldDoc;
        },
      },
    },
    items: {
      schema: itemsSchema,
      migrationStrategies: {
        1: (oldDoc: any) => {
          oldDoc.order = 0;
          return oldDoc;
        },
      },
    },
    timetablesync: {
      schema: timetableSyncSchema,
    },
  });

  return db;
};

export const loadDummyData = async ({
  foldersCol,
  itemsCol,
}: {
  foldersCol: any;
  itemsCol: any;
}) => {
  const folders: FolderDocType[] = [
    {
      id: "root",
      title: "電機資訊學院學士班 111學年度",
      parent: null,
      min: 128,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "top",
      order: 0,
    },
    {
      id: "school_required",
      title: "校定必修",
      parent: "root",
      min: 30,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 1,
    },
    {
      id: "chinese",
      title: "大學中文",
      parent: "school_required",
      min: 2,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 2,
    },
    {
      id: "english",
      title: "英文領域",
      parent: "school_required",
      min: 8,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 3,
    },
    {
      id: "general_education",
      title: "通識課程",
      parent: "school_required",
      min: 20,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 4,
    },
    {
      id: "core_courses",
      title: "核心必修",
      parent: "general_education",
      min: 4,
      max: -1,
      metric: "courses",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 5,
    },
    {
      id: "elective_courses",
      title: "選修科目",
      parent: "general_education",
      min: 8,
      max: 12,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 6,
    },
    {
      id: "physical_education",
      title: "體育",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 7,
    },
    {
      id: "service_learning",
      title: "服務學習",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 8,
    },
    {
      id: "conduct",
      title: "操行",
      parent: "school_required",
      min: 0,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 9,
    },
    {
      id: "department_required",
      title: "班定必修",
      parent: "root",
      min: 43,
      max: 44,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 10,
    },
    {
      id: "calculus",
      title: "微積分一、微積分二",
      parent: "department_required",
      min: 8,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 11,
    },
    {
      id: "physics",
      title: "普通物理一、普通物理二",
      parent: "department_required",
      min: 6,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 12,
    },
    {
      id: "physics_lab",
      title: "普通物理實驗一",
      parent: "department_required",
      min: 1,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 13,
    },
    {
      id: "programming",
      title: "計算機程式設計",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 14,
    },
    {
      id: "logic_design",
      title: "邏輯設計",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 15,
    },
    {
      id: "discrete_math",
      title: "離散數學",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 16,
    },
    {
      id: "differential_eq",
      title: "常微分方程",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 17,
    },
    {
      id: "linear_algebra",
      title: "線性代數",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 18,
    },
    {
      id: "probability",
      title: "機率",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 19,
    },
    {
      id: "signals_systems",
      title: "訊號與系統",
      parent: "department_required",
      min: 3,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 20,
    },
    {
      id: "project_one",
      title: "實作專題一或系統整合實作一",
      parent: "department_required",
      min: 1,
      max: 2,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 21,
    },
    {
      id: "project_two",
      title: "實作專題二或系統整合實作二",
      parent: "department_required",
      min: 2,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 22,
    },
    {
      id: "lab_courses",
      title: "實驗",
      parent: "department_required",
      min: 4,
      max: -1,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "left",
      order: 23,
    },
    {
      id: "core_electives",
      title: "核心選修",
      parent: "root",
      min: 15,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 24,
    },
    {
      id: "professional_electives",
      title: "專業選修",
      parent: "root",
      min: 27,
      max: -1,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 25,
    },
    {
      id: "second_major",
      title: "他系第二專長",
      parent: "root",
      min: 26,
      max: 33,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 26,
    },
    {
      id: "other_electives",
      title: "其餘選修",
      parent: "root",
      min: 6,
      max: 14,
      metric: "credits",
      requireChildValidation: true,
      titlePlacement: "left",
      order: 27,
    },
  ];

  await foldersCol.bulkInsert(folders);
};

export const RxDBProvider: FC<PropsWithChildren> = ({ children }) => {
  const [db, setDb] = useState<Awaited<ReturnType<typeof initializeRxDB>>>();

  useEffect(() => {
    initializeRxDB().then(setDb);
  }, []);

  return <Provider db={db}>{children}</Provider>;
};
