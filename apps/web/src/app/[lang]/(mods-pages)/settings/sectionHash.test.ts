import { describe, expect, test } from "bun:test";
import { getSectionIdFromHash } from "./sectionHash";

describe("getSectionIdFromHash", () => {
  const sectionIds = ["appearance", "account", "privacy"];
  const settingIds = [
    "setting-language",
    "setting-dark-mode",
    "setting-restore-backup",
  ];

  test("returns the section id for a known hash", () => {
    expect(getSectionIdFromHash("#account", sectionIds)).toBe("account");
  });

  test("returns the setting id for a known setting hash", () => {
    expect(
      getSectionIdFromHash("#setting-language", sectionIds, settingIds),
    ).toBe("setting-language");
    expect(
      getSectionIdFromHash("#setting-restore-backup", sectionIds, settingIds),
    ).toBe("setting-restore-backup");
  });

  test("does not resolve unknown or empty hashes", () => {
    expect(getSectionIdFromHash("#unknown", sectionIds)).toBeNull();
    expect(
      getSectionIdFromHash("#setting-unknown", sectionIds, settingIds),
    ).toBeNull();
    expect(getSectionIdFromHash("", sectionIds)).toBeNull();
  });
});
