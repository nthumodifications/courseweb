import { describe, expect, test } from "bun:test";
import { parseYouBikeDeepLink } from "./deep-link";
import { hasDeepLinkRequestChanged } from "@/lib/deep-links/deep-link";

describe("parseYouBikeDeepLink", () => {
  test.each([
    [
      "valid",
      "tab=main&station=500401008",
      { tab: "main", stationId: "500401008" },
    ],
    [
      "encoded",
      "tab=%6E%61%6E%64%61&station=%35%30%30%34%30%31%30%33%30",
      { tab: "nanda", stationId: "500401030" },
    ],
    ["invalid", "tab=unknown&station=not-a-station", {}],
    ["empty", "tab=&station=", {}],
    ["missing", "", {}],
    [
      "duplicate tab is ignored",
      "tab=main&tab=nanda&station=500401008",
      { stationId: "500401008" },
    ],
  ] as const)("handles %s values", (_label, query, expected) => {
    expect(parseYouBikeDeepLink(new URLSearchParams(query))).toEqual(expected);
  });
});

describe("YouBike deep-link request tracking", () => {
  test.each([
    ["first station", null, "500401008", true],
    ["same station", "500401008", "500401008", false],
    ["changed station", "500401008", "500401030", true],
    ["removed station", "500401008", undefined, true],
  ] as const)("detects %s", (_label, lastApplied, request, expected) => {
    expect(hasDeepLinkRequestChanged(lastApplied, request)).toBe(expected);
  });
});
