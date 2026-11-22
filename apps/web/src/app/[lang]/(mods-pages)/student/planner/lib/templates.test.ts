import { describe, expect, test } from "bun:test";
import type {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "../rxdb";
import {
  plannerToTemplatePayload,
  templatePayloadToPlannerDocs,
} from "./templates";

const planner = {
  id: "planner-1",
  title: "Plan",
  department: "Department",
  requiredCredits: 128,
  enrollmentYear: "113",
  graduationYear: "117",
  includedSemesters: [],
} as PlannerDataDocType;
const folders: FolderDocType[] = [
  {
    id: "folder-a",
    title: "Core",
    parent: "planner-1",
    min: 10,
    max: 20,
    metric: "credits",
    requireChildValidation: false,
    titlePlacement: "top",
    order: 0,
    color: null,
  },
  {
    id: "_unsorted",
    title: "Unsorted",
    parent: "planner-1",
    min: 0,
    max: 0,
    metric: "credits",
    requireChildValidation: false,
    titlePlacement: "top",
    order: 999,
    color: null,
  },
];
const items: ItemDocType[] = [
  {
    uuid: "course-uuid",
    id: "CS 135000",
    title: "Intro",
    parent: "folder-a",
    credits: 3,
    raw_id: "raw",
    semester: "11310",
    status: "completed",
    description: "Course detail",
    comments: "Private note",
    instructor: "Private instructor",
    dependson: [],
    order: 0,
  },
];
const semesters: SemesterDocType[] = [
  {
    id: "11310",
    name: "113-1",
    status: "completed",
    year: "113",
    term: "1",
    startDate: null,
    endDate: null,
    isActive: false,
    order: 0,
  },
];

describe("planner template conversion", () => {
  test("round trips folder and course structure with relative terms", () => {
    const payload = plannerToTemplatePayload({
      planner,
      folders,
      items,
      semesters,
    });
    expect(payload.folders).toHaveLength(1);
    expect(payload.items[0]?.term).toBe("1-1");
    const restored = templatePayloadToPlannerDocs(payload, {
      enrollmentYear: "113",
      existingSemesters: [],
    });
    expect(restored.folders).toHaveLength(1);
    expect(restored.items[0]).toMatchObject({
      id: "CS 135000",
      title: "Intro",
      credits: 3,
      status: "planned",
      semester: "11310",
    });
    expect(restored.items[0]?.parent).toBe(restored.folders[0]?.id);
    expect(restored.semesters).toHaveLength(1);
    expect(restored.semesters[0]).toMatchObject({
      id: "11310",
      year: "113",
      term: "1",
      status: "planned",
    });
  });

  test("strips personal fields and drops an empty unsorted folder", () => {
    const payload = plannerToTemplatePayload({
      planner,
      folders,
      items,
      semesters,
    });
    expect(payload.folders.some((folder) => folder.key === "_unsorted")).toBe(
      false,
    );
    expect(payload.items[0]).not.toHaveProperty("status");
    expect(payload.items[0]).not.toHaveProperty("comments");
    expect(payload.items[0]).not.toHaveProperty("instructor");
    expect(payload.items[0]).not.toHaveProperty("semesterId");
    expect(payload.items[0]?.term).toBe("1-1");
  });

  test("remaps course dependencies through template keys and fresh item ids", () => {
    const dependentItems = [
      ...items,
      {
        ...items[0]!,
        uuid: "dependent-uuid",
        id: "CS 235000",
        title: "Next course",
        dependson: ["CS 135000"],
      },
    ];
    const payload = plannerToTemplatePayload({
      planner,
      folders,
      items: dependentItems,
      semesters,
    });
    expect(payload.items[1]?.dependson).toEqual([payload.items[0]?.key]);
    const restored = templatePayloadToPlannerDocs(payload, {
      enrollmentYear: "113",
      existingSemesters: [],
    });
    expect(restored.items[1]?.dependson).toEqual([restored.items[0]?.uuid]);
  });
});
