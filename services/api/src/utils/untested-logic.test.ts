import { describe, expect, test } from "bun:test";
import { getRangeOfDays } from "./dates";
import { getSafeShortlinkUrl, SHORTLINK_ORIGIN } from "./shortlink-url";

describe("API date range helper", () => {
  test.each([
    [
      "ordinary UTC calendar days",
      "2026-10-06T00:00:00Z",
      "2026-10-07T00:00:00Z",
      ["2026-10-06T00:00:00.000Z", "2026-10-07T00:00:00.000Z"],
    ],
    [
      "Asia/Taipei calendar days",
      "2026-09-30T00:00:00+08:00",
      "2026-10-02T00:00:00+08:00",
      [
        "2026-09-29T16:00:00.000Z",
        "2026-09-30T16:00:00.000Z",
        "2026-10-01T16:00:00.000Z",
      ],
    ],
    [
      "local calendar days across daylight saving time",
      "2026-03-08T00:00:00-08:00",
      "2026-03-10T00:00:00-07:00",
      [
        "2026-03-08T08:00:00.000Z",
        "2026-03-09T07:00:00.000Z",
        "2026-03-10T07:00:00.000Z",
      ],
    ],
  ])("includes both endpoints for %s", (_, start, end, expected) => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(
        getRangeOfDays(new Date(start), new Date(end)).map((value) =>
          value.toISOString(),
        ),
      ).toEqual(expected);
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
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
