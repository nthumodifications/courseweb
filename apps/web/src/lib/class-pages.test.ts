import { describe, expect, test } from "bun:test";
import {
  getClassPageClientAccess,
  isCourseInStoredTimetable,
} from "./class-pages";

describe("class page access gates", () => {
  test("matches exact semester and course values from the stored timetable", () => {
    const timetable = { "11510": ["11510-CS101"], "11420": ["11420-MATH1"] };
    expect(isCourseInStoredTimetable(timetable, "11510", "11510-CS101")).toBe(
      true,
    );
    expect(isCourseInStoredTimetable(timetable, "11510", "11420-MATH1")).toBe(
      false,
    );
    expect(isCourseInStoredTimetable(timetable, "11520", "11510-CS101")).toBe(
      false,
    );
    expect(isCourseInStoredTimetable(null, "11510", "11510-CS101")).toBe(false);
  });

  test("never exposes the page before sign-in, timetable eligibility, opt-in, and joining", () => {
    expect(
      getClassPageClientAccess({
        signedIn: false,
        inTimetable: true,
        profileOptedIn: true,
        joined: true,
      }),
    ).toBe("sign_in");
    expect(
      getClassPageClientAccess({
        signedIn: true,
        inTimetable: false,
        profileOptedIn: true,
        joined: true,
      }),
    ).toBe("add_course");
    expect(
      getClassPageClientAccess({
        signedIn: true,
        inTimetable: true,
        profileOptedIn: false,
        joined: false,
      }),
    ).toBe("create_profile");
    expect(
      getClassPageClientAccess({
        signedIn: true,
        inTimetable: true,
        profileOptedIn: true,
        joined: false,
      }),
    ).toBe("join");
    expect(
      getClassPageClientAccess({
        signedIn: true,
        inTimetable: true,
        profileOptedIn: true,
        joined: true,
      }),
    ).toBe("view");
  });
});
