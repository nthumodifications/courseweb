import { describe, expect, test } from "bun:test";
import { getTermAvailability } from "./module-availability";

const years = (from: number, to: number, term: 1 | 2) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i}${term}0`);
const statuses = (semesters: string[], latest = "11510") =>
  getTermAvailability(semesters, latest).map((entry) => entry.status);

describe("getTermAvailability", () => {
  test("every semester", () => {
    // 115-2 has not been published yet, so spring is judged up to 114.
    expect(statuses([...years(108, 115, 1), ...years(108, 114, 2)])).toEqual([
      "every_year",
      "every_year",
    ]);
  });

  test("fall only", () => {
    expect(statuses(years(108, 115, 1))).toEqual(["every_year", "never"]);
  });

  test("most and some years", () => {
    expect(
      statuses(["10810", "10910", "11010", "11110", "11310", "11410", "11510"]),
    ).toEqual(["most_years", "never"]);
    expect(statuses(["10810", "11010", "11320", "11410"])).toEqual([
      "some_years",
      "once",
    ]);
  });

  test("a term that has not run in its last two possible years is stopped", () => {
    expect(statuses(years(108, 112, 1))).toEqual(["stopped", "never"]);
    // Missing only the newest year is not enough to call it stopped.
    expect(statuses(years(108, 114, 1))).toEqual(["most_years", "never"]);
  });

  test("a brand-new course makes no claim about a pattern", () => {
    expect(statuses(["11510"])).toEqual(["once", "never"]);
    expect(statuses(["11420"])).toEqual(["never", "once"]);
  });

  test("summer appears only when it exists in the data", () => {
    expect(statuses(["11410", "11430"]).length).toBe(3);
    expect(statuses(["11410"]).length).toBe(2);
  });

  test("counts are reported for the label", () => {
    const [fall] = getTermAvailability(["10810", "11010", "11410"], "11510");
    expect(fall).toMatchObject({ offeredYears: 3, possibleYears: 8 });
  });
});
