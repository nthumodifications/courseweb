import { describe, expect, test } from "bun:test";
import { plannerMigrationStrategies } from "./rxdb";

type CollectionName = keyof typeof plannerMigrationStrategies;

const migrateFromV0 = (collection: CollectionName, document: unknown) => {
  let migrated = structuredClone(document);
  const strategies = plannerMigrationStrategies[collection];
  for (const version of Object.keys(strategies).map(Number).sort()) {
    migrated = strategies[version as keyof typeof strategies](migrated);
  }
  return migrated;
};

const oldDocuments: Record<CollectionName, Record<string, unknown>> = {
  folders: {
    id: "root",
    title: "Required courses",
    parent: null,
    min: 0,
    max: 20,
    metric: "courses",
    requireChildValidation: true,
    titlePlacement: "top",
    order: 0,
    color: "#123456",
    expanded: true,
    _deleted: true,
  },
  items: {
    uuid: "item-1",
    id: "CS1001",
    title: "Programming",
    parent: "root",
    credits: 3,
    raw_id: "11410-CS1001",
    semester: "11410",
    status: "planned",
    description: "Keep this description",
    comments: "Keep this note",
    instructor: "Professor",
    dependson: ["CS0001"],
    order: 1,
    _deleted: true,
  },
  plannerdata: {
    id: "plan-1",
    title: "Computer science plan",
    department: "CS",
    requiredCredits: 128,
    enrollmentYear: "114",
    graduationYear: "118",
    includedSemesters: ["114-1", "114-2"],
    description: "Keep this plan",
    createdAt: "2025-09-01T00:00:00.000Z",
    updatedAt: "2025-09-02T00:00:00.000Z",
    _deleted: true,
  },
  semesters: {
    id: "114-1",
    name: "114-1",
    status: "in-progress",
    year: "114",
    term: "1",
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2026-01-31T00:00:00.000Z",
    isActive: true,
    order: 0,
    _deleted: true,
  },
};

describe("planner RxDB migration strategies", () => {
  test("runs every stored v0 document through every current strategy without losing data", () => {
    expect(migrateFromV0("folders", oldDocuments.folders)).toEqual(
      oldDocuments.folders,
    );
    expect(migrateFromV0("items", oldDocuments.items)).toEqual(
      oldDocuments.items,
    );
    expect(migrateFromV0("semesters", oldDocuments.semesters)).toEqual(
      oldDocuments.semesters,
    );
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...plannerData
    } = oldDocuments.plannerdata;
    expect(migrateFromV0("plannerdata", oldDocuments.plannerdata)).toEqual(
      plannerData,
    );
  });

  test("keeps migration chains idempotent, including tombstones", () => {
    for (const collection of Object.keys(oldDocuments) as CollectionName[]) {
      const once = migrateFromV0(collection, oldDocuments[collection]);
      expect(migrateFromV0(collection, once)).toEqual(once);
      expect((once as Record<string, unknown>)._deleted).toBe(true);
    }
  });
});
