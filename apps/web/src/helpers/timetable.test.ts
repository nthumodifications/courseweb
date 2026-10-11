import { describe, expect, test } from "bun:test";
import {
  classifyCustomTimetableSlot,
  addTimetableFractions,
  canSortTimetableCourses,
  createTimetableFromCourses,
  createTimetableFromCoursesAndCustomItems,
  createTimetableFromCustomItems,
  formatTimetableClock,
  getCustomSlotTimeRange,
  getTimetableCourseListStatus,
  getTimetableDataTimeRange,
  getUnresolvedCourseIds,
  getTimetableExtendedHoursGeometry,
  getTimetableOffGridBounds,
  getTimetableTimeRangePosition,
  getTimetableSlotTimes,
  migrateLegacySemesterCourses,
  reorderStoredCourseIdsByCredits,
  timeToMinutes,
  colorMapFromCourses,
  timetableGridEnd,
  timetableGridStart,
} from "./timetable";
import {
  filterHiddenCourseIds,
  filterHiddenCourses,
  normalizeHiddenCourses,
} from "./timetableVisibility";
import { CourseTimeslotData, CustomTimetableItem } from "@/types/timetable";
import { MinimalCourse } from "@/types/courses";
import { scheduleTimeSlots } from "@courseweb/shared";

const courseWithTimes = (
  times: string[],
  venues: string[] = ["Room 1"],
): MinimalCourse => ({
  raw_id: "11510-CS 1010 1",
  name_zh: "測試課程",
  name_en: "Test course",
  semester: "11510",
  department: "CS",
  course: "1010",
  class: "1",
  credits: 2,
  venues,
  times,
  teacher_zh: [],
  teacher_en: [],
  language: "中",
});

const timetableCoordinates = (timetable: CourseTimeslotData[]) =>
  timetable.map(({ dayOfWeek, startTime, endTime }) => ({
    dayOfWeek,
    startTime,
    endTime,
  }));

const slot = (start: string, end: string) => ({
  day: 0,
  start,
  end,
});

const activity = (start: string, end: string) =>
  ({ customSlot: slot(start, end) }) as CourseTimeslotData;

describe("custom timetable slot start-time classification", () => {
  test("converts clock values and exposes schedule slot boundaries", () => {
    expect(timeToMinutes("09:05")).toBe(545);
    expect(formatTimetableClock(545)).toBe("09:05");
    expect(getCustomSlotTimeRange(slot("09:05", "10:20"))).toEqual({
      start: 545,
      end: 620,
    });
    expect(getTimetableSlotTimes({ startTime: 0, endTime: 1 })).toEqual({
      start: scheduleTimeSlots[0],
      end: scheduleTimeSlots[1],
    });
  });

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

describe("course timetable slot parsing", () => {
  test("drops unknown day and period pairs while retaining valid pairs", () => {
    const course = courseWithTimes(["M1MXM2", "X1", "Ｍ3", "M"]);
    const before = structuredClone(course);

    const timetable = createTimetableFromCourses([course]);

    expect(timetableCoordinates(timetable)).toEqual([
      { dayOfWeek: 0, startTime: 0, endTime: 1 },
    ]);
    expect(course).toEqual(before);
    expect(timetable.every((slot) => slot.dayOfWeek >= 0)).toBe(true);
    expect(timetable.every((slot) => slot.startTime >= 0)).toBe(true);
    expect(
      timetable.every((slot) => slot.endTime < scheduleTimeSlots.length),
    ).toBe(true);
  });

  test("accepts Sunday and ignores whitespace between valid codes", () => {
    const timetable = createTimetableFromCourses([
      courseWithTimes(["U1U2", "M1 M2"]),
    ]);

    expect(timetableCoordinates(timetable)).toEqual([
      { dayOfWeek: 6, startTime: 0, endTime: 1 },
      { dayOfWeek: 0, startTime: 0, endTime: 1 },
    ]);
  });

  test("keeps courses with no drawable slots and defaults missing venues", () => {
    const noTimes = courseWithTimes([], ["Room 1"]);
    const noVenues = courseWithTimes(["M1"], []);

    expect(createTimetableFromCourses([noTimes])).toEqual([]);
    expect(createTimetableFromCourses([noVenues])[0]?.venue).toBe("");
  });

  test("uses safe bounds for a manually malformed consumer slot", () => {
    expect(
      getTimetableDataTimeRange({
        course: courseWithTimes([]),
        venue: "",
        dayOfWeek: -1,
        startTime: -1,
        endTime: -1,
        color: "#000000",
        textColor: "#ffffff",
      }),
    ).toEqual({ start: 8 * 60, end: 22 * 60 + 20 });
  });

  test("assigns separate columns to overlapping course slots", () => {
    const [first, second] = createTimetableFromCourses([
      courseWithTimes(["M1M2"]),
      {
        ...courseWithTimes(["M2M3"]),
        raw_id: "11510-CS 1010 2",
      },
    ]);
    const result = addTimetableFractions([first!, second!]);

    expect(
      result.map(({ fraction, fractionIndex, timeSlots }) => ({
        fraction,
        fractionIndex,
        timeSlots,
      })),
    ).toEqual([
      { fraction: 2, fractionIndex: 1, timeSlots: ["0:0", "0:1"] },
      { fraction: 2, fractionIndex: 2, timeSlots: ["0:1", "0:2"] },
    ]);
  });

  test("maps freeform and legacy custom items into timetable slots", () => {
    const freeform = {
      id: "seminar",
      title: "Seminar",
      color: "#123456",
      slots: [slot("09:05", "10:20")],
    };
    const legacy = {
      id: "legacy",
      title: "Legacy",
      color: "#654321",
      schedule: ["M1M2"],
    };

    const result = createTimetableFromCoursesAndCustomItems(
      [],
      [freeform, legacy],
    );

    expect(result).toHaveLength(2);
    expect(
      result.map(({ customItem, customSlot }) => ({
        id: customItem?.id,
        customSlot,
      })),
    ).toEqual([
      { id: "seminar", customSlot: slot("09:05", "10:20") },
      { id: "legacy", customSlot: slot("08:00", "09:50") },
    ]);
  });

  test("cycles explicit timetable colors and keeps duplicate ids deterministic", () => {
    expect(colorMapFromCourses(["a", "b", "c"], ["#one", "#two"])).toEqual({
      a: "#one",
      b: "#two",
      c: "#one",
    });
    expect(
      createTimetableFromCustomItems([
        { id: "bad", title: "Bad", color: "#000", slots: [] },
      ]),
    ).toEqual([]);
  });

  test("assigns the same colors when courses arrive in a different order", () => {
    expect(
      colorMapFromCourses(["course-b", "course-a"], ["#one", "#two"]),
    ).toEqual({
      "course-a": "#one",
      "course-b": "#two",
    });
  });

  test("groups irregularly ordered consecutive periods", () => {
    const timetable = createTimetableFromCourses([courseWithTimes(["M1M3M2"])]);

    expect(timetableCoordinates(timetable)).toEqual([
      { dayOfWeek: 0, startTime: 0, endTime: 2 },
    ]);
  });

  test("preserves HEAD output for an ordered timetable", () => {
    expect(
      timetableCoordinates(
        createTimetableFromCourses([courseWithTimes(["M1M2"])]),
      ),
    ).toEqual([{ dayOfWeek: 0, startTime: 0, endTime: 1 }]);
  });
});

describe("hidden timetable courses", () => {
  test("keeps old preference data visible and normalizes only true flags", () => {
    expect(normalizeHiddenCourses(undefined)).toEqual({});
    expect(
      normalizeHiddenCourses({ hidden: true, visible: false, invalid: "yes" }),
    ).toEqual({ hidden: true });
  });

  test("filters hidden courses without changing the stored course list", () => {
    const courses = [{ raw_id: "11510-hidden" }, { raw_id: "11510-visible" }];

    expect(filterHiddenCourses(courses, { "11510-hidden": true })).toEqual([
      courses[1],
    ]);
    expect(
      filterHiddenCourseIds(
        courses.map((course) => course.raw_id),
        { "11510-hidden": true },
      ),
    ).toEqual(["11510-visible"]);
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
