import { describe, expect, test } from "bun:test";
import {
  getDefaultSemester,
  getLastSemester,
  getNextCourseSemester,
  hydrateSemesters,
  lastSemester,
  semesterInfo,
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

describe("semester hydration", () => {
  const serializeDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const initialRows = semesterInfo.map((semester) => ({
    ...semester,
    begins: serializeDate(semester.begins),
    ends: serializeDate(semester.ends),
  }));

  test("accepts API rows without repeating server plausibility or overlap checks", () => {
    try {
      expect(
        hydrateSemesters([
          {
            id: "11510",
            begins: "2027-03-01",
            ends: "2027-03-02",
            hasCourses: true,
          },
          {
            id: "11520",
            begins: "2027-03-02",
            ends: "2027-03-03",
            hasCourses: true,
          },
        ]),
      ).toBe(true);
      expect(semesterInfo.map(({ id }) => id)).toEqual(["11510", "11520"]);
      expect(lastSemester.id).toBe("11520");
    } finally {
      hydrateSemesters(initialRows);
    }
  });

  test("ignores malformed and empty payloads without clearing the fallback", () => {
    const originalIds = semesterInfo.map(({ id }) => id);
    expect(
      hydrateSemesters([
        {
          id: "11540",
          begins: "2027-02-30",
          ends: "2027-06-01",
          hasCourses: true,
        },
      ]),
    ).toBe(false);
    expect(hydrateSemesters([])).toBe(false);
    expect(semesterInfo.map(({ id }) => id)).toEqual(originalIds);
  });
});
