import { describe, expect, test } from "bun:test";
import { getSectionIdFromHash } from "./sectionHash";

describe("getSectionIdFromHash", () => {
  const sectionIds = ["appearance", "account", "privacy"];

  test("returns the section id for a known hash", () => {
    expect(getSectionIdFromHash("#account", sectionIds)).toBe("account");
  });

  test("does not resolve unknown or empty hashes", () => {
    expect(getSectionIdFromHash("#unknown", sectionIds)).toBeNull();
    expect(getSectionIdFromHash("", sectionIds)).toBeNull();
  });
});
