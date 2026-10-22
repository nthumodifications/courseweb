import { describe, expect, test } from "bun:test";
import {
  calculateTimetableImportDiff,
  decodeCcXpImportQuery,
  isCcXpImportReady,
  normalizeCcxpCourseId,
} from "./ccxpImport";

describe("CCXP course ID normalization", () => {
  test.each([
    ["11510CS 535100", "11510CS 535100"],
    [" 11510cs   535100 ", "11510CS 535100"],
    ["11510CS535100", "11510CS 535100"],
    ["11510MATH 101000", "11510MATH 101000"],
    ["BOGUS", null],
    ["11510CS 53510", null],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeCcxpCourseId(input)).toBe(expected);
  });
});

describe("CCXP timetable import parsing and diffs", () => {
  test("trims and de-duplicates valid IDs while retaining malformed IDs", () => {
    const decoded = decodeCcXpImportQuery(
      new URLSearchParams(
        "semester_11510=11510CS%20535100,%2011510CS535100%20,BOGUS",
      ),
    );

    expect(decoded).toEqual({
      courseCodes: { "11510": ["11510CS 535100"] },
      colorMap: {},
      initialSemester: "11510",
      unknownCourseIds: {
        "11510": [{ id: "BOGUS", reason: "malformed" }],
      },
      unknownCourseIdOverflow: {},
    });
  });

  test("deduplicates normalized IDs before applying the course cap", () => {
    const duplicateSpellings = Array.from(
      { length: 60 },
      (_, index) => `11510CS${" ".repeat(index + 1)}535100`,
    );
    const decoded = decodeCcXpImportQuery(
      new URLSearchParams(
        `semester_11510=${[...duplicateSpellings, "11510AES 450100"].join(",")}`,
      ),
    );

    expect(decoded?.courseCodes["11510"]).toEqual([
      "11510CS 535100",
      "11510AES 450100",
    ]);
    expect(decoded?.unknownCourseIds).toEqual({});
  });

  test("bounds malformed raw input and reports omitted unknown IDs", () => {
    const malformedIds = Array.from({ length: 10_000 }, (_, index) =>
      `malformed-${index}`,
    );
    const decoded = decodeCcXpImportQuery(
      new URLSearchParams(`semester_11510=${malformedIds.join(",")}`),
    );

    expect(decoded?.unknownCourseIds["11510"]).toHaveLength(20);
    expect(decoded?.unknownCourseIdOverflow["11510"]).toBe(9_980);
  });

  test.each([
    [false, true, true, true, true, false],
    [true, false, true, true, true, false],
    [false, false, false, true, true, false],
    [false, false, true, false, true, false],
    [false, false, true, true, false, false],
    [false, false, true, true, true, true],
  ])(
    "allows actions only after courses and timetable data settle (%s, %s, %s, %s, %s)",
    (
      coursesLoading,
      hasCourseQueryError,
      hasImportedCourses,
      timetableDataReady,
      customItemsDataReady,
      expected,
    ) => {
      expect(
        isCcXpImportReady({
          coursesLoading,
          hasCourseQueryError,
          importedCourseCount: hasImportedCourses ? 1 : 0,
          timetableDataReady,
          customItemsDataReady,
        }),
      ).toBe(expected);
    },
  );

  test.each([
    [
      "merge",
      ["old", "same"],
      ["same", "new"],
      { added: ["new"], alreadyPresent: ["same"], removed: [] },
    ],
    [
      "replace",
      ["old", "same"],
      ["same", "new"],
      { added: ["new"], alreadyPresent: ["same"], removed: ["old"] },
    ],
  ] as const)("calculates the %s diff", (mode, current, incoming, expected) => {
    expect(calculateTimetableImportDiff(current, incoming, mode)).toEqual(
      expected,
    );
  });
});
