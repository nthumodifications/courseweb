import { describe, expect, test } from "bun:test";
import { getRangeOfDays } from "./dates";
import { getSafeShortlinkUrl, SHORTLINK_ORIGIN } from "./shortlink-url";

describe("API date range helper", () => {
  test("includes both UTC endpoints and does not depend on the machine zone", () => {
    expect(
      getRangeOfDays(
        new Date("2026-10-06T00:00:00Z"),
        new Date("2026-10-07T00:00:00Z"),
      ).map((value) => value.toISOString()),
    ).toEqual(["2026-10-06T00:00:00.000Z", "2026-10-07T00:00:00.000Z"]);
  });
});

describe("safe shortlink reconstruction", () => {
  test.each([
    [
      `${SHORTLINK_ORIGIN}/course/11510?q=A%20B#top`,
      `${SHORTLINK_ORIGIN}/course/11510?q=A%20B#top`,
    ],
    ["https://evil.example/course", null],
    ["not a URL", null],
  ])("handles stored shortlink %s", (value, expected) => {
    expect(getSafeShortlinkUrl(value)).toBe(expected);
  });
});

test.todo(
  "API getRangeOfDays should preserve local midnight across DST transitions",
);
