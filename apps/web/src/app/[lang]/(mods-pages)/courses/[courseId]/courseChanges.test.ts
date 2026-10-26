import { expect, test } from "bun:test";
import {
  COURSE_CHANGE_FIELDS,
  filterCourseChanges,
  formatCourseChanges,
  groupCourseChanges,
  parseCourseChanges,
  type CourseChangeLabels,
  type CourseChangeRecord,
} from "./courseChanges";

const labels: CourseChangeLabels = {
  fields: Object.fromEntries(
    [...COURSE_CHANGE_FIELDS, "course", "teacher"].map((field) => [
      field,
      field,
    ]),
  ) as CourseChangeLabels["fields"],
  removed: "No longer listed",
  reappeared: "Listed again",
  empty: "None",
  trueValue: "Yes",
  falseValue: "No",
  valueSeparator: ", ",
  teacherField: "teacher_en",
};

const change = (
  field: CourseChangeRecord["field"],
  oldValue: unknown,
  newValue: unknown,
  overrides: Partial<CourseChangeRecord> = {},
): CourseChangeRecord => ({
  id: 1,
  raw_id: "11510-CS  390100",
  semester: "11510",
  field,
  old_value: oldValue,
  new_value: newValue,
  kind: "changed",
  detected_at: "2026-10-21T12:34:56.000Z",
  ...overrides,
});

test.each([
  ["times", ["W3", "W4"], "W3W4"],
  ["venues", ["人社院", "綜二館"], "人社院, 綜二館"],
  ["capacity", 50, "50"],
  ["no_extra_selection", false, "No"],
  ["note", null, "None"],
] as const)("formats %s values readably", (field, value, expected) => {
  expect(
    formatCourseChanges([change(field, null, value)], labels)[0].newValue,
  ).toBe(expected);
});

test("filters initial empty-to-set synchronizer noise", () => {
  expect(
    filterCourseChanges([
      change("note", "", "first note"),
      change("capacity", 50, 60),
      change("venues", [], ["人社院"]),
    ]),
  ).toEqual([change("capacity", 50, 60)]);
});

test("groups changes by department and raw course ID", () => {
  const result = groupCourseChanges([
    change("capacity", 50, 60, {
      raw_id: "11510CS 101000",
      course: {
        raw_id: "11510CS 101000",
        name_zh: "資料結構",
        name_en: "Data Structures",
        department: "CS",
        course: "1010",
        class: "00",
      },
    }),
    change("note", "old", "new", {
      id: 2,
      raw_id: "11510MATH 101000",
      course: {
        raw_id: "11510MATH 101000",
        name_zh: "微積分",
        name_en: "Calculus",
        department: "MATH",
        course: "1010",
        class: "00",
      },
    }),
    change("credits", 2, 3, {
      id: 3,
      raw_id: "11510CS 101000",
      course: {
        raw_id: "11510CS 101000",
        name_zh: "資料結構",
        name_en: "Data Structures",
        department: "CS",
        course: "1010",
        class: "00",
      },
    }),
  ]);

  expect(
    result.map((department) => ({
      department: department.department,
      courses: department.courses.map((course) => ({
        rawId: course.rawId,
        changeIds: course.changes.map((item) => item.id),
      })),
    })),
  ).toEqual([
    {
      department: "CS",
      courses: [{ rawId: "11510CS 101000", changeIds: [1, 3] }],
    },
    {
      department: "MATH",
      courses: [{ rawId: "11510MATH 101000", changeIds: [2] }],
    },
  ]);
});

test.each(COURSE_CHANGE_FIELDS)("maps the tracked field %s", (field) => {
  expect(
    formatCourseChanges([change(field, "old", "new")], labels)[0].fieldLabel,
  ).toBe(field === "teacher_zh" || field === "teacher_en" ? "teacher" : field);
});

test.each([
  { oops: true },
  [null],
  [change("capacity", 50, 60, { field: 123 as never })],
  [change("capacity", 50, 60, { kind: "unknown" as never })],
  [change("capacity", 50, 60, { detected_at: 123 as never })],
])("rejects invalid changes payload %j", (payload) => {
  expect(() => parseCourseChanges(payload)).toThrow("Invalid course changes");
});

test.each([
  ["removed", "No longer listed"],
  ["reappeared", "Listed again"],
] as const)("formats %s as a course status", (kind, expected) => {
  const result = formatCourseChanges(
    [change("course", { note: "old" }, null, { kind })],
    labels,
  )[0];
  expect(result.statusLabel).toBe(expected);
  expect(result.oldValue).toBeNull();
  expect(result.newValue).toBeNull();
});

test("merges bilingual teacher changes from one sync for the current language", () => {
  const result = formatCourseChanges(
    [
      change("teacher_zh", ["王小明"], ["李小華"]),
      change("teacher_en", ["Ming Wang"], ["Hua Li"], { id: 2 }),
      change("capacity", 50, 60, { id: 3 }),
    ],
    labels,
  );

  expect(result).toHaveLength(2);
  expect(
    result.map(({ fieldLabel, oldValue, newValue }) => [
      fieldLabel,
      oldValue,
      newValue,
    ]),
  ).toEqual([
    ["teacher", "Ming Wang", "Hua Li"],
    ["capacity", "50", "60"],
  ]);
});

test.each(["teacher_zh", "teacher_en"] as const)(
  "uses one teacher entry when the current language is %s",
  (teacherField) => {
    const result = formatCourseChanges(
      [
        change("teacher_zh", ["王小明"], ["李小華"]),
        change("teacher_en", ["Ming Wang"], ["Hua Li"], { id: 2 }),
      ],
      { ...labels, teacherField },
    );

    expect(result).toHaveLength(1);
    expect(result[0].fieldLabel).toBe("teacher");
    expect(result[0].oldValue).toBe(
      teacherField === "teacher_zh" ? "王小明" : "Ming Wang",
    );
  },
);
