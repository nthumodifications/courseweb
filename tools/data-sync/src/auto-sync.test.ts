import { describe, expect, it } from "bun:test";
import {
  chooseSemestersToSync,
  nextSemesterId,
  runAutoSync,
  type AutoSyncSemester,
} from "./auto-sync";

const semesters: AutoSyncSemester[] = [
  { id: "11510", begins: "2026-09-07", ends: "2026-12-27", hasCourses: true },
  { id: "11520", begins: "2027-02-15", ends: "2027-06-06", hasCourses: false },
  { id: "11610", begins: "2027-09-06", ends: "2027-12-26", hasCourses: false },
];

describe("automatic semester sync selection", () => {
  it("uses the active semester and its next dated term", () => {
    expect(
      chooseSemestersToSync(new Date("2026-10-09T12:00:00Z"), semesters),
    ).toEqual(["11510", "11520"]);
  });

  it("uses the most recent term during a break and probes the next dated term", () => {
    expect(
      chooseSemestersToSync(new Date("2027-06-20T12:00:00Z"), semesters),
    ).toEqual(["11520", "11610"]);
  });

  it("probes a known summer term before the next fall term", () => {
    expect(
      chooseSemestersToSync(new Date("2027-06-10T12:00:00Z"), [
        ...semesters,
        { id: "11530", begins: "2027-06-14", ends: "2027-08-27" },
      ]),
    ).toEqual(["11520", "11530"]);
  });

  it("selects a current term from Taipei date if the calendar API is unavailable", () => {
    expect(chooseSemestersToSync(new Date("2026-10-09T16:05:00Z"), [])).toEqual(
      ["11510", "11520"],
    );
  });

  it("keeps summer in the CCXP ID sequence", () => {
    expect(nextSemesterId("11520")).toBe("11530");
    expect(nextSemesterId("11530")).toBe("11610");
  });

  it("treats an empty next-semester CCXP result as a quiet skip", async () => {
    const calls: Array<{ semester: string; skipIfEmpty: boolean | undefined }> =
      [];
    const result = await runAutoSync({
      now: new Date("2026-10-09T12:00:00Z"),
      semesters: semesters.slice(0, 2),
      syncSemester: async (semester, options) => {
        calls.push({ semester, skipIfEmpty: options?.skipIfEmpty });
        return {
          success: true,
          stats: { coursesScraped: semester === "11510" ? 12 : 0 },
        };
      },
    });

    expect(result.success).toBe(true);
    expect(result.semesters).toEqual(["11510", "11520"]);
    expect(calls).toEqual([
      { semester: "11510", skipIfEmpty: false },
      { semester: "11520", skipIfEmpty: true },
    ]);
  });
});
