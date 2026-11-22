import { describe, expect, test } from "bun:test";
import {
  deriveFolderProgress,
  deriveOverallProgress,
  effectiveStatus,
  normalizeSemesterId,
  type ProgressFolder,
  type ProgressItem,
} from "./progress";

const folder = (overrides: Partial<ProgressFolder> = {}): ProgressFolder => ({
  id: "major",
  parent: "planner-1",
  min: 10,
  max: 20,
  metric: "credits",
  requireChildValidation: false,
  ...overrides,
});

describe("planner progress derivation", () => {
  test("uses the semester as status and keeps failure as an override", () => {
    expect(
      effectiveStatus({ semester: "11210", status: "planned" }, "11410"),
    ).toBe("completed");
    expect(
      effectiveStatus({ semester: "114-1", status: "completed" }, "11410"),
    ).toBe("in-progress");
    expect(effectiveStatus({ semester: "11510", status: null }, "11410")).toBe(
      "planned",
    );
    expect(
      effectiveStatus({ semester: "11210", status: "failed" }, "11410"),
    ).toBe("failed");
    expect(
      effectiveStatus({ semester: null, status: "completed" }, "11410"),
    ).toBe("completed");
    expect(effectiveStatus({ semester: null, status: null }, "11410")).toBe(
      "planned",
    );
    expect(normalizeSemesterId("114-1")).toBe("11410");
  });

  test("derives overall credits while excluding failed courses", () => {
    const items: ProgressItem[] = [
      { credits: 4, semester: "11310" },
      { credits: 3, semester: "11410" },
      { credits: 2, semester: "11510" },
      { credits: 5, semester: "11310", status: "failed" },
    ];

    expect(deriveOverallProgress(items, "11410", 20)).toEqual({
      done: 4,
      inProgress: 3,
      planned: 2,
      required: 20,
      remaining: 11,
    });
  });

  test("aggregates nested folders and counts courses when that metric is selected", () => {
    const folders = [
      folder({ id: "root", min: 2, max: 4, metric: "courses" }),
      folder({ id: "leaf", parent: "root", min: 5, metric: "credits" }),
    ];
    const items: ProgressItem[] = [
      { parent: "leaf", credits: 3, semester: "11310" },
      { parent: "leaf", credits: 2, semester: "11410" },
      { parent: "leaf", credits: 6, semester: "11510" },
      { parent: "leaf", credits: 8, semester: "11310", status: "failed" },
    ];
    const progress = deriveFolderProgress(folders, items, "11410");

    expect(progress.get("leaf")).toEqual({
      done: 3,
      inProgress: 2,
      planned: 6,
      min: 5,
      max: 20,
      remaining: 0,
      satisfied: true,
    });
    expect(progress.get("root")).toEqual({
      done: 1,
      inProgress: 1,
      planned: 1,
      min: 2,
      max: 4,
      remaining: 0,
      satisfied: true,
    });
  });

  test("requires children to satisfy their own minimum when configured", () => {
    const folders = [
      folder({ id: "root", min: 1, requireChildValidation: true }),
      folder({ id: "leaf", parent: "root", min: 4 }),
    ];
    const items: ProgressItem[] = [
      { parent: "leaf", credits: 3, semester: "11310" },
      { parent: "leaf", credits: 4, semester: "11310", status: "failed" },
    ];
    const progress = deriveFolderProgress(folders, items, "11410");

    expect(progress.get("root")?.remaining).toBe(0);
    expect(progress.get("root")?.satisfied).toBe(false);
    expect(progress.get("leaf")?.remaining).toBe(1);
  });

  test("validates immediate children unless a child also validates descendants", () => {
    const folders = [
      folder({ id: "root", min: 1, requireChildValidation: true }),
      folder({ id: "child", parent: "root", min: 1 }),
      folder({ id: "grandchild", parent: "child", min: 5 }),
    ];
    const items: ProgressItem[] = [
      { parent: "child", credits: 1, semester: "11310" },
    ];
    const progress = deriveFolderProgress(folders, items, "11410");

    expect(progress.get("root")?.satisfied).toBe(true);
    expect(progress.get("grandchild")?.satisfied).toBe(false);
  });
});
