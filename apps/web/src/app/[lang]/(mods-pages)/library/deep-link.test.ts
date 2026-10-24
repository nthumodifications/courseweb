import { describe, expect, test } from "bun:test";
import { parseLibraryDeepLink } from "./deep-link";

describe("parseLibraryDeepLink", () => {
  test.each([
    [
      "branch=moonlight&category=group",
      { branch: "moonlight", category: "group" },
    ],
    ["branch=invalid&category=invalid", { branch: "all", category: "all" }],
    ["branch=toString&category=__proto__", { branch: "all", category: "all" }],
    ["branch=%20main%20&category=", { branch: "all", category: "all" }],
    ["branch=main&branch=ctm", { branch: "all", category: "all" }],
    ["category=group&category=av", { branch: "all", category: "all" }],
    ["", { branch: "all", category: "all" }],
  ])("parses %s", (query, expected) => {
    expect(parseLibraryDeepLink(new URLSearchParams(query))).toEqual(expected);
  });
});
