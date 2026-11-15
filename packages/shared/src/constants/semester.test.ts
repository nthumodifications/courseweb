import { describe, expect, test } from "bun:test";
import {
  getDefaultSemester,
  getLastSemester,
  getNextCourseSemester,
  hydrateSemesters,
  lastSemester,
  mergeSemesterRows,
  type SemesterInfo,
} from "./semester";

const row = (
  id: string,
  begins: string,
  ends: string,
  hasCourses = true,
): SemesterInfo => ({
  id,
  year: Number(id.slice(0, 3)) + 1911,
  semester: Number(id.slice(3, 4)),
  begins: new Date(`${begins}T00:00:00`),
  ends: new Date(`${ends}T00:00:00`),
  hasCourses,
});

const semesters = [
  row("11410", "2025-09-01", "2025-12-21"),
  row("11420", "2026-02-23", "2026-06-14"),
  row("11510", "2026-09-07", "2026-12-27"),
  row("11520", "2027-02-15", "2027-06-06", false),
];

describe("semester resolution", () => {
  test("uses the earliest course semester before the first known date", () => {
    expect(getDefaultSemester(new Date("2025-01-01"), semesters).id).toBe(
      "11410",
    );
  });

  test("keeps the active semester as default", () => {
    expect(getDefaultSemester(new Date("2026-10-01"), semesters).id).toBe(
      "11510",
    );
  });

  test("advances to the next semester with courses during the break", () => {
    const withUpcomingCourses = semesters.map((semester) =>
      semester.id === "11520" ? { ...semester, hasCourses: true } : semester,
    );
    expect(
      getDefaultSemester(new Date("2026-12-28"), withUpcomingCourses).id,
    ).toBe("11520");
  });

  test("uses the most recent course semester when the next has no courses", () => {
    expect(getDefaultSemester(new Date("2026-12-28"), semesters).id).toBe(
      "11510",
    );
  });

  test("does not let a course-bearing summer become the default or prompt target", () => {
    const withSummer = [
      ...semesters,
      row("11530", "2027-06-14", "2027-08-27"),
      row("11610", "2027-09-06", "2027-12-26"),
    ];

    expect(getDefaultSemester(new Date("2027-07-01"), withSummer).id).toBe(
      "11610",
    );
    expect(
      getNextCourseSemester(new Date("2027-07-01"), withSummer),
    ).toBeUndefined();
    expect(getNextCourseSemester(new Date("2027-04-01"), withSummer)?.id).toBe(
      "11610",
    );
  });

  test("after the last known date, keeps the newest semester with courses", () => {
    expect(getDefaultSemester(new Date("2028-01-01"), semesters).id).toBe(
      "11510",
    );
    expect(getLastSemester(semesters).id).toBe("11510");
  });

  test("shows a next-course candidate only while the current semester is active", () => {
    const withUpcomingCourses = semesters.map((semester) =>
      semester.id === "11520" ? { ...semester, hasCourses: true } : semester,
    );
    expect(
      getNextCourseSemester(new Date("2026-10-01"), withUpcomingCourses)?.id,
    ).toBe("11520");
    expect(
      getNextCourseSemester(new Date("2026-12-28"), withUpcomingCourses),
    ).toBe(undefined);
    expect(getNextCourseSemester(new Date("2026-10-01"), semesters)).toBe(
      undefined,
    );
  });
});

describe("semester merge", () => {
  test("uses a valid future API row and includes new IDs", () => {
    const merged = mergeSemesterRows(
      [
        {
          id: "11520",
          begins: "2027-02-16",
          ends: "2027-06-07",
          hasCourses: true,
        },
        {
          id: "11530",
          begins: "2027-06-28",
          ends: "2027-08-06",
          hasCourses: true,
        },
      ],
      new Date("2026-12-01"),
    );
    expect(merged.find((semester) => semester.id === "11520")?.begins).toEqual(
      new Date(2027, 1, 16),
    );
    expect(merged.find((semester) => semester.id === "11530")?.hasCourses).toBe(
      true,
    );
  });

  test("replaces an estimated API semester when scraped dates arrive", () => {
    const estimated = mergeSemesterRows(
      [
        {
          id: "11610",
          begins: "2027-09-07",
          ends: "2027-12-27",
          hasCourses: true,
          estimated: true,
        },
      ],
      new Date("2027-06-20"),
    );
    expect(estimated.find((semester) => semester.id === "11610")).toMatchObject(
      { estimated: true },
    );

    const withRealDates = mergeSemesterRows(
      [
        {
          id: "11610",
          begins: "2027-09-06",
          ends: "2027-12-26",
          hasCourses: true,
          estimated: false,
        },
      ],
      new Date("2027-06-20"),
    );
    expect(
      withRealDates.find((semester) => semester.id === "11610"),
    ).toMatchObject({
      begins: new Date(2027, 8, 6),
      ends: new Date(2027, 11, 26),
      estimated: false,
    });
  });

  test("keeps bundled dates authoritative after a semester has ended", () => {
    const merged = mergeSemesterRows(
      [
        {
          id: "11520",
          begins: "2027-02-16",
          ends: "2027-06-07",
          hasCourses: true,
        },
      ],
      new Date("2027-06-07"),
    );
    const semester = merged.find((item) => item.id === "11520")!;
    expect(semester.begins).toEqual(new Date(2027, 1, 15));
    expect(semester.ends).toEqual(new Date(2027, 5, 6));
    expect(semester.hasCourses).toBe(true);
  });

  test("ignores malformed rows", () => {
    expect(
      mergeSemesterRows([
        {
          id: "11540",
          begins: "2027-02-30",
          ends: "2027-06-01",
          hasCourses: true,
        },
      ]).some((semester) => semester.id === "11540"),
    ).toBe(false);
  });

  test("hydrates the live last-semester binding when course data arrives", () => {
    expect(
      hydrateSemesters([
        {
          id: "11520",
          begins: "2027-02-15",
          ends: "2027-06-06",
          hasCourses: true,
        },
      ]),
    ).toBe(true);
    expect(lastSemester.id).toBe("11520");
    hydrateSemesters([]);
    expect(lastSemester.id).toBe("11510");
  });
});
