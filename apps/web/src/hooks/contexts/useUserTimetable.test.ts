import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TIMETABLE_DISPLAY_PREFERENCES,
  normalizeTimetableDisplayPreferences,
} from "./useUserTimetable";

describe("timetable title behavior preference migration", () => {
  test("defaults older saved preferences to fit", () => {
    const { titleBehavior: _titleBehavior, ...olderPreferences } =
      DEFAULT_TIMETABLE_DISPLAY_PREFERENCES;

    expect(
      normalizeTimetableDisplayPreferences(olderPreferences).titleBehavior,
    ).toBe("fit");
  });

  test("keeps valid line clamp choices and falls back for invalid values", () => {
    expect(
      normalizeTimetableDisplayPreferences({
        ...DEFAULT_TIMETABLE_DISPLAY_PREFERENCES,
        titleBehavior: "2",
      }).titleBehavior,
    ).toBe("2");

    expect(
      normalizeTimetableDisplayPreferences({
        ...DEFAULT_TIMETABLE_DISPLAY_PREFERENCES,
        titleBehavior: "invalid" as "fit",
      }).titleBehavior,
    ).toBe("fit");
  });
});
