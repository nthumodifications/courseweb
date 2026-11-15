import { describe, expect, test } from "bun:test";
import { mergeSemesterRows } from "./semester-info";

describe("server semester merge", () => {
  test("uses valid future rows and adds new semester IDs", () => {
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

  test("accepts estimated dates and replaces them with scraped dates", () => {
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

  test("keeps bundled dates authoritative once the semester has ended", () => {
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

  test("rejects malformed and implausible rows and date overlaps", () => {
    const merged = mergeSemesterRows([
      {
        id: "11540",
        begins: "2027-02-30",
        ends: "2027-06-01",
        hasCourses: true,
      },
      {
        id: "11530",
        begins: "2027-06-01",
        ends: "2027-08-01",
        hasCourses: true,
      },
      {
        id: "11610",
        begins: "2027-03-01",
        ends: "2027-03-02",
        hasCourses: true,
      },
    ]);

    expect(merged.some((semester) => semester.id === "11540")).toBe(false);
    expect(merged.some((semester) => semester.id === "11530")).toBe(false);
    expect(merged.some((semester) => semester.id === "11610")).toBe(false);
  });
});
