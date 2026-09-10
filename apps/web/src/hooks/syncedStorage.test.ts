import { describe, expect, test } from "bun:test";
import {
  mergeCourseStorage,
  mergeStringArray,
  nextUpdatedAt,
  normalizeSyncedData,
} from "./syncedStorage";

describe("synced storage reconciliation", () => {
  test("unions course ids within each semester without duplicates", () => {
    expect(
      mergeCourseStorage(
        { "11410": ["11410-CS-1", "11410-CS-2"] },
        { "11410": ["11410-CS-2", "11410-MATH-1"], "11320": ["11320-EE-1"] },
      ),
    ).toEqual({
      "11410": ["11410-CS-1", "11410-CS-2", "11410-MATH-1"],
      "11320": ["11320-EE-1"],
    });
  });

  test("unions favourites from two devices", () => {
    expect(
      mergeStringArray(["course-a", "course-b"], ["course-b", "course-c"]),
    ).toEqual(["course-a", "course-b", "course-c"]);
  });

  test("keeps updatedAt monotonic when the wall clock does not advance", () => {
    expect(nextUpdatedAt(100, 100)).toBe(101);
    expect(nextUpdatedAt(100, 99)).toBe(101);
    expect(nextUpdatedAt(100, 101)).toBe(101);
  });

  test("upgrades a legacy wrapper without losing its value or timestamp", () => {
    expect(
      normalizeSyncedData<{ "11410": string[] }>(
        {
          value: { "11410": ["course-a"] },
          lastModified: 123,
        },
        "device-a",
        999,
      ),
    ).toEqual({
      value: { "11410": ["course-a"] },
      lastModified: 123,
      updatedAt: 123,
      deviceId: "device-a",
    });
  });
});
