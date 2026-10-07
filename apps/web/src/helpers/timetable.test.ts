import { describe, expect, test } from "bun:test";
import {
  classifyCustomTimetableSlot,
  canSortTimetableCourses,
  getTimetableCourseListStatus,
  getUnresolvedCourseIds,
  getTimetableExtendedHoursGeometry,
  getTimetableOffGridBounds,
  getTimetableTimeRangePosition,
  migrateLegacySemesterCourses,
  reorderStoredCourseIdsByCredits,
  timetableGridEnd,
  timetableGridStart,
} from "./timetable";
import { CourseTimeslotData, CustomTimetableItem } from "@/types/timetable";

const slot = (start: string, end: string) => ({
  day: 0,
  start,
  end,
});

const activity = (start: string, end: string) =>
  ({ customSlot: slot(start, end) }) as CourseTimeslotData;

describe("custom timetable slot start-time classification", () => {
  test("starts during school hours and stays in the grid", () => {
    expect(classifyCustomTimetableSlot(slot("09:00", "10:00"))).toBe("grid");
  });

  test("starts during school hours and remains in the grid when it runs late", () => {
    expect(classifyCustomTimetableSlot(slot("21:00", "23:30"))).toBe("grid");
  });

  test("starts before school and belongs to the start region", () => {
    expect(classifyCustomTimetableSlot(slot("06:15", "07:30"))).toBe("start");
  });

  test("starts at or after school end and belongs to the end region", () => {
    expect(classifyCustomTimetableSlot(slot("22:40", "23:50"))).toBe("end");
  });

  test("uses half-open school-hour boundaries", () => {
    expect(
      classifyCustomTimetableSlot(
        slot("08:00", "09:00"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("grid");
    expect(
      classifyCustomTimetableSlot(
        slot("22:20", "23:00"),
        timetableGridStart,
        timetableGridEnd,
      ),
    ).toBe("end");
  });

  test("classifies each slot independently when one item splits regions", () => {
    const item: CustomTimetableItem = {
      id: "split-item",
      title: "Split activity",
      color: "#123456",
      slots: [
        slot("09:00", "10:00"),
        slot("06:15", "07:30"),
        slot("22:40", "23:50"),
      ],
    };

    expect(
      item.slots.map((value) => classifyCustomTimetableSlot(value)),
    ).toEqual(["grid", "start", "end"]);
  });
});

describe("extended timetable band geometry", () => {
  test("finds the earliest start-region time and latest end-region time", () => {
    expect(
      getTimetableOffGridBounds([
        activity("06:15", "07:30"),
        activity("21:00", "23:30"),
        activity("05:45", "07:00"),
        activity("22:40", "23:50"),
      ]),
    ).toEqual({ preStart: 345, lateEnd: 1430 });
  });

  test("creates a late region for a grid-starting activity that runs late", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("09:00", "10:00"), activity("21:00", "23:30")],
      860,
    );

    expect(geometry.pre).toBeNull();
    expect(geometry.late).not.toBeNull();
  });

  test("does not create either region when there are no out-of-hours activities", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("09:00", "10:00")],
      860,
    );

    expect(geometry.pre).toBeNull();
    expect(geometry.late).toBeNull();
  });

  test("keeps a grid-starting late block continuous across the boundary", () => {
    const geometry = getTimetableExtendedHoursGeometry(
      [activity("21:00", "23:30")],
      860,
    );

    // Derive the expectation from the geometry rather than hardcoding pixels:
    // region height uses a fixed scale, deliberately independent of the
    // measured grid, so pinning literals here just re-encodes that constant.
    const position = getTimetableTimeRangePosition(1260, 1410, geometry);
    const lateSize = geometry.late?.size ?? 0;

    // Starts inside the grid...
    expect(position.start).toBe(780);
    // ...and runs continuously to the far edge of the end region.
    expect(position.end).toBeCloseTo(geometry.gridSize + lateSize, 5);
    expect(position.size).toBeCloseTo(position.end - position.start, 5);
    expect(position.size).toBeGreaterThan(geometry.gridSize - 780);
  });

  test("supports a start-region block and an end-region block in one item", () => {
    const item: CustomTimetableItem = {
      id: "split-item",
      title: "Split activity",
      color: "#123456",
      slots: [slot("06:15", "07:30"), slot("22:40", "23:50")],
    };
    const geometry = getTimetableExtendedHoursGeometry(
      item.slots.map((customSlot) => ({ customSlot }) as CourseTimeslotData),
      860,
    );

    expect(geometry.pre?.start).toBe(375);
    expect(geometry.late?.end).toBe(1430);
  });
});

describe("stored timetable course ids", () => {
  const storedIds = ["11510-A", "11510-missing", "11510-B"];
  const resolvedCourses = [
    { raw_id: "11510-A", credits: 2 },
    { raw_id: "11510-B", credits: 3 },
  ];

  test("keeps unresolved ids visible to storage-aware callers", () => {
    expect(getUnresolvedCourseIds(storedIds, resolvedCourses)).toEqual([
      "11510-missing",
    ]);
  });

  test("sorts resolved ids without deleting unresolved stored ids", () => {
    expect(reorderStoredCourseIdsByCredits(storedIds, resolvedCourses)).toEqual(
      ["11510-B", "11510-A", "11510-missing"],
    );
  });

  test("disables credit sorting while course data is loading or failed", () => {
    expect(canSortTimetableCourses(true, null)).toBe(false);
    expect(canSortTimetableCourses(false, new Error("failed"))).toBe(false);
    expect(canSortTimetableCourses(false, null)).toBe(true);
  });

  test("distinguishes loading, failed, empty, and populated course lists", () => {
    expect(getTimetableCourseListStatus(true, null, 0, 0)).toBe("loading");
    expect(getTimetableCourseListStatus(false, new Error("failed"), 0, 0)).toBe(
      "error",
    );
    expect(getTimetableCourseListStatus(false, null, 0, 0)).toBe("empty");
    expect(getTimetableCourseListStatus(false, null, 0, 1)).toBe("ready");
  });
});

describe("legacy semester_1121 migration", () => {
  test("guards legacy JSON and groups every migrated course by semester", () => {
    expect(migrateLegacySemesterCourses("not-json")).toBeNull();
    expect(
      migrateLegacySemesterCourses(
        JSON.stringify(["11410-A", "11510-B", "11410-C", "11410-A"]),
      ),
    ).toEqual({
      "11410": ["11410-A", "11410-C"],
      "11510": ["11510-B"],
    });
  });
});
