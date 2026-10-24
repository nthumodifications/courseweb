import { describe, expect, test } from "bun:test";
import {
  getSportsDeepLinkAction,
  parseSportsVenuesDeepLink,
} from "./deep-link";
import { hasDeepLinkRequestChanged } from "@/lib/deep-links/deep-link";

const facilities = ["體育館", "重訓室"] as const;

describe("parseSportsVenuesDeepLink", () => {
  test.each([
    ["valid", "facility=體育館", { facility: "體育館" }],
    ["encoded", "facility=%E9%87%8D%E8%A8%93%E5%AE%A4", { facility: "重訓室" }],
    ["invalid", "facility=unknown", {}],
    ["empty", "facility=", {}],
    ["missing", "", {}],
    ["duplicate facility is ignored", "facility=體育館&facility=重訓室", {}],
  ] as const)("handles %s values", (_label, query, expected) => {
    expect(
      parseSportsVenuesDeepLink(new URLSearchParams(query), facilities),
    ).toEqual(expected);
  });
});

describe("sports deep-link state transitions", () => {
  test.each([
    ["opens requested facility", undefined, "體育館", "open"],
    ["switches an open sheet", "體育館", "重訓室", "open"],
    ["refreshes the selected forecast", "體育館", "體育館", "update"],
    ["closes when removed", "體育館", undefined, "close"],
    ["does nothing when both are absent", undefined, undefined, "ignore"],
  ] as const)("%s", (_label, selected, requested, expected) => {
    expect(getSportsDeepLinkAction(selected, requested)).toBe(expected);
  });

  test("recognizes a changed facility request while a sheet is open", () => {
    expect(hasDeepLinkRequestChanged("體育館", "重訓室")).toBe(true);
  });
});
