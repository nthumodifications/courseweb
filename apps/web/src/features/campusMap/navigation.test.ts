import { describe, expect, test } from "bun:test";
import { getCampusMapHref } from "./navigation";

describe("campus map navigation", () => {
  test("links a timetable venue to its campus building", () => {
    expect(getCampusMapHref("zh", ["DELTA台達629"])).toBe(
      "/zh/map?building=delta",
    );
  });

  test("uses the first venue with a known campus building", () => {
    expect(getCampusMapHref("en", ["UNKNOWN999", "EECS資電101"])).toBe(
      "/en/map?building=eecs",
    );
  });

  test("does not link a course without a mapped venue", () => {
    expect(getCampusMapHref("zh", [])).toBeUndefined();
    expect(getCampusMapHref("zh", ["UNKNOWN999"])).toBeUndefined();
  });
});
