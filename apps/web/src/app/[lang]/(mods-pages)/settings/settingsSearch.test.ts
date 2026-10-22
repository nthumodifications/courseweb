import { describe, expect, test } from "bun:test";
import {
  matchesSettingsSearch,
  shouldShowSettingsSearchItem,
  shouldShowSettingsSection,
} from "./settingsSearch";

describe("matchesSettingsSearch", () => {
  test("matches titles case-insensitively", () => {
    expect(matchesSettingsSearch("THEME", { title: "Theme Preset" })).toBe(
      true,
    );
  });

  test("matches descriptions and extra keywords", () => {
    expect(
      matchesSettingsSearch("vertical", {
        title: "Default View",
        description: "Use vertical view when opening timetable page",
      }),
    ).toBe(true);
    expect(
      matchesSettingsSearch("dark mode", {
        title: "Appearance",
        keywords: ["theme", "dark mode"],
      }),
    ).toBe(true);
  });

  test("matches localized Traditional and Simplified Chinese strings", () => {
    expect(matchesSettingsSearch("主題", { title: "主題預設" })).toBe(true);
    expect(matchesSettingsSearch("暗色", { title: "切换暗色模式" })).toBe(true);
  });

  test("does not match unrelated text", () => {
    expect(
      matchesSettingsSearch("privacy", {
        title: "Appearance",
        description: "Choose the visual style",
        keywords: ["theme"],
      }),
    ).toBe(false);
  });
});

describe("shouldShowSettingsSection", () => {
  test("keeps all sections visible for an empty query", () => {
    expect(shouldShowSettingsSection("", false)).toBe(true);
  });

  test("hides a section when an active query has no visible children", () => {
    expect(shouldShowSettingsSection("theme", false)).toBe(false);
    expect(shouldShowSettingsSection("theme", true)).toBe(true);
  });
});

describe("shouldShowSettingsSearchItem", () => {
  test("shows every child when the section title matches", () => {
    expect(
      shouldShowSettingsSearchItem("privacy", true, {
        title: "Analytics",
      }),
    ).toBe(true);
  });

  test("filters non-matching children when the section title does not match", () => {
    expect(
      shouldShowSettingsSearchItem("privacy", false, {
        title: "Analytics",
      }),
    ).toBe(false);
  });
});
