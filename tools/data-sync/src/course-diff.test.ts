import { describe, expect, test } from "bun:test";
import {
  diffCourseRows,
  type CourseChange,
  type CourseSnapshot,
} from "./course-diff";

const course = (overrides: Partial<CourseSnapshot> = {}): CourseSnapshot => ({
  raw_id: "11510-CS 101000",
  semester: "11510",
  times: ["1A"],
  venues: ["人社院"],
  teacher_zh: ["王老師"],
  teacher_en: ["Wang"],
  capacity: 50,
  reserve: 0,
  credits: 3,
  closed_mark: "",
  no_extra_selection: false,
  note: "",
  restrictions: "",
  ...overrides,
});

describe("diffCourseRows", () => {
  const cases: Array<
    [
      string,
      CourseSnapshot[],
      CourseSnapshot[],
      Set<string> | undefined,
      CourseChange[],
    ]
  > = [
    ["first sync", [], [course()], undefined, []],
    [
      "trims strings and treats null, empty strings, and empty arrays alike",
      [course({ note: null, venues: [] })],
      [course({ note: "  ", venues: null })],
      undefined,
      [],
    ],
    [
      "ignores course row order but keeps array field order significant",
      [course(), course({ raw_id: "11510-MATH 101000", times: ["2B", "3C"] })],
      [course({ raw_id: "11510-MATH 101000", times: ["3C", "2B"] }), course()],
      undefined,
      [
        {
          raw_id: "11510-MATH 101000",
          semester: "11510",
          field: "times",
          old_value: ["2B", "3C"],
          new_value: ["3C", "2B"],
          kind: "changed",
        },
      ],
    ],
    [
      "does not record an empty to set fill-in",
      [course({ note: null })],
      [course({ note: "公告" })],
      undefined,
      [],
    ],
    [
      "records set to empty and set to different",
      [course({ note: "舊公告", capacity: 50 })],
      [course({ note: "", capacity: 60 })],
      undefined,
      [
        {
          raw_id: "11510-CS 101000",
          semester: "11510",
          field: "capacity",
          old_value: 50,
          new_value: 60,
          kind: "changed",
        },
        {
          raw_id: "11510-CS 101000",
          semester: "11510",
          field: "note",
          old_value: "舊公告",
          new_value: null,
          kind: "changed",
        },
      ],
    ],
    [
      "records complete snapshot removals",
      Array.from({ length: 10 }, (_, index) =>
        course({ raw_id: `course-${index}` }),
      ),
      Array.from({ length: 9 }, (_, index) =>
        course({ raw_id: `course-${index}` }),
      ),
      undefined,
      [
        {
          raw_id: "course-9",
          semester: "11510",
          field: "course",
          old_value: {
            times: ["1A"],
            venues: ["人社院"],
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
          new_value: null,
          kind: "removed",
        },
      ],
    ],
    [
      "skips all removals for an incomplete snapshot",
      Array.from({ length: 10 }, (_, index) => course({ raw_id: `course-${index}` })),
      Array.from({ length: 8 }, (_, index) => course({ raw_id: `course-${index}` })),
      undefined,
      [],
    ],
    [
      "records a previously removed course when it reappears",
      [course({ raw_id: "11510-MATH 101000" })],
      [course({ raw_id: "11510-MATH 101000" })],
      new Set(["11510-MATH 101000"]),
      [
        {
          raw_id: "11510-MATH 101000",
          semester: "11510",
          field: "course",
          old_value: null,
          new_value: {
            times: ["1A"],
            venues: ["人社院"],
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
          kind: "reappeared",
        },
      ],
    ],
  ];

  test.each(cases)("%s", (_name, previous, current, previouslyRemovedIds, expected) => {
    expect(
      diffCourseRows(previous, current, { previouslyRemovedIds }),
    ).toEqual(expected);
  });
});
