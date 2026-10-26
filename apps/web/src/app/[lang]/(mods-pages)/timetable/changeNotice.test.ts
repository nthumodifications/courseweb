import { expect, test } from "bun:test";
import {
  parseCourseChanges,
  type CourseChangeRecord,
} from "../courses/[courseId]/courseChanges";
import {
  getCourseChangesForNotice,
  selectUrgentCourseChanges,
} from "./changeNotice";

const change = (
  field: string,
  old_value: unknown,
  new_value: unknown,
  overrides: Partial<CourseChangeRecord> = {},
): CourseChangeRecord => ({
  id: 1,
  raw_id: "11510-CS 101000",
  semester: "11510",
  field,
  old_value,
  new_value,
  kind: "changed",
  detected_at: "2026-10-21T12:34:56.000Z",
  ...overrides,
});

test("keeps urgent changes, drops first-time fills, and groups newest fields", () => {
  const changes = parseCourseChanges([
    change("times", ["W3"], ["W4"], {
      id: 1,
      detected_at: "2026-10-21T12:00:00.000Z",
    }),
    change("times", ["W4"], ["W5"], {
      id: 2,
      detected_at: "2026-10-22T12:00:00.000Z",
    }),
    change("venues", [], ["台達105"], { id: 3 }),
    change("capacity", 50, 60, { id: 4 }),
    change("venues", ["台達105"], ["資電235"], { id: 5 }),
    change("times", ["W6"], ["W7"], {
      id: 6,
      raw_id: "11510-CS 102000",
    }),
  ]);

  expect(selectUrgentCourseChanges(changes, new Set([6]))).toEqual([
    {
      raw_id: "11510-CS 101000",
      changes: [
        expect.objectContaining({ id: 2, field: "times" }),
        expect.objectContaining({ id: 5, field: "venues" }),
      ],
    },
  ]);
});

test("keeps removed and reappeared course status changes", () => {
  const changes = parseCourseChanges([
    change(
      "course",
      {
        raw_id: "11510-CS 101000",
        course: "CS 101",
        class: "00",
        name_zh: "資料結構",
        times: ["W3"],
        venues: ["台達105"],
        teacher_zh: ["王老師"],
        teacher_en: ["Wang"],
        capacity: 50,
        reserve: 0,
        credits: 3,
        closed_mark: null,
        no_extra_selection: false,
        note: null,
        restrictions: null,
      },
      null,
      {
        id: 10,
        kind: "removed",
      },
    ),
    change(
      "course",
      null,
      { times: ["W3"] },
      {
        id: 11,
        kind: "reappeared",
        detected_at: "2026-10-22T12:34:56.000Z",
      },
    ),
  ]);

  expect(selectUrgentCourseChanges(changes, new Set())).toEqual([
    {
      raw_id: "11510-CS 101000",
      changes: [expect.objectContaining({ id: 11, kind: "reappeared" })],
    },
  ]);
});

test("keeps successful data while a query refetches or errors", () => {
  const previous = parseCourseChanges([
    change("course", { times: ["W3"] }, null, {
      id: 20,
      kind: "removed",
    }),
  ]);

  expect(getCourseChangesForNotice(previous, false, undefined)).toBe(previous);
  expect(getCourseChangesForNotice(previous, false, new Error("refetch"))).toBe(
    previous,
  );
  expect(getCourseChangesForNotice(undefined, true, undefined)).toEqual([]);
  expect(
    getCourseChangesForNotice(undefined, false, new Error("initial")),
  ).toEqual([]);
});
