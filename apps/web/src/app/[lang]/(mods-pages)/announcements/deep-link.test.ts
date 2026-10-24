import { describe, expect, test } from "bun:test";
import { parseAnnouncementsDeepLink } from "./deep-link";
import { hasDeepLinkRequestChanged } from "@/lib/deep-link";

const sourceIds = ["source-academic", "source-student"] as const;

describe("parseAnnouncementsDeepLink", () => {
  test.each([
    ["valid", "source=source-academic", { source: "source-academic" }],
    [
      "encoded",
      "source=%73%6F%75%72%63%65%2D%73%74%75%64%65%6E%74",
      { source: "source-student" },
    ],
    ["invalid", "source=unknown", {}],
    ["empty", "source=", {}],
    ["missing", "", {}],
  ] as const)("handles %s values", (_label, query, expected) => {
    expect(
      parseAnnouncementsDeepLink(new URLSearchParams(query), sourceIds),
    ).toEqual(expected);
  });
});

describe("announcement deep-link request tracking", () => {
  test.each([
    ["first request", null, "source-academic", true],
    ["same request", "source-academic", "source-academic", false],
    ["changed request", "source-academic", "source-student", true],
    ["removed request", "source-academic", undefined, true],
    ["manual state after absent request", undefined, undefined, false],
  ] as const)("detects %s", (_label, lastApplied, request, expected) => {
    expect(hasDeepLinkRequestChanged(lastApplied, request)).toBe(expected);
  });
});
