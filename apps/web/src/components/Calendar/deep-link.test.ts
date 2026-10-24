import { describe, expect, test } from "bun:test";
import { getTaipeiDateKey } from "@/helpers/dates";
import {
  getCalendarTransition,
  getCalendarDeepLinkRequest,
  isCalendarNavigationNoop,
  parseCalendarDeepLink,
  shouldResetCalendarToOrigin,
} from "./deep-link";

describe("parseCalendarDeepLink", () => {
  test.each([
    [
      "valid",
      "date=2026-10-24&view=month",
      { date: "2026-10-24", view: "month" },
    ],
    [
      "encoded",
      "date=2026%2D10%2D24&view=%75%70%63%6F%6D%69%6E%67",
      { date: "2026-10-24", view: "upcoming" },
    ],
    ["invalid", "date=2026-02-29&view=year", {}],
    ["empty", "date=&view=", {}],
    ["missing", "", {}],
  ] as const)("handles %s values", (_label, query, expected) => {
    expect(parseCalendarDeepLink(new URLSearchParams(query))).toEqual(expected);
  });
});

describe("calendar deep-link transitions", () => {
  test("uses the clicked date as the anchor when switching month to week", () => {
    const clickedDate = new Date("2026-10-24T12:00:00Z");
    const transition = getCalendarTransition("week", clickedDate, [
      new Date("2026-09-27T12:00:00Z"),
    ]);

    expect(transition.urlDate).toBe(clickedDate);
    expect(getTaipeiDateKey(transition.displayDates[0])).toBe("2026-10-18");
  });

  test.each([
    ["same request", { date: "2026-10-24", view: "month" }, "2026-10-24|month"],
    ["changed request", { date: "2026-11-21", view: "week" }, "2026-11-21|week"],
  ] as const)("builds the %s key", (_label, request, expected) => {
    expect(getCalendarDeepLinkRequest(request)).toBe(expected);
  });

  test.each([
    ["first empty request", null, "|", false],
    ["changed to empty request", "2026-10-24|month", "|", true],
    ["unchanged empty request", "|", "|", false],
  ] as const)(
    "resets to origin only for a changed empty request: %s",
    (_label, lastAppliedRequest, request, expected) => {
      expect(shouldResetCalendarToOrigin(lastAppliedRequest, request)).toBe(
        expected,
      );
    },
  );

  test.each([
    ["upcoming", true],
    ["week", false],
    ["month", false],
  ] as const)("recognizes navigation no-ops in %s mode", (mode, expected) => {
    expect(isCalendarNavigationNoop(mode)).toBe(expected);
  });
});
