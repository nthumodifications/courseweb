import { describe, expect, test } from "bun:test";
import { GET } from "./route";

describe("timetable ICS route", () => {
  test("redirects the legacy web route while preserving export parameters", () => {
    const response = GET(
      new Request(
        "https://www.nthumods.com/en/timetable/calendar.ics?semester=11510&semester_11510=11510-CS-101,11510-MATH-201",
      ),
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://api.nthumods.com/timetable/calendar.ics?semester=11510&semester_11510=11510-CS-101%2C11510-MATH-201",
    );
  });
});
