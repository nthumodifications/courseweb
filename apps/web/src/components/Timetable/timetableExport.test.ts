import { describe, expect, test } from "bun:test";
import type { TimetableDisplayPreferences } from "@/hooks/contexts/useUserTimetable";
import { setTimetableCourseCodeDisplay } from "./timetableExport";

const preferences: TimetableDisplayPreferences = {
  language: "app",
  align: "center",
  verticalAlign: "top",
  fontSize: "sm",
  fontFamily: "system",
  display: {
    title: true,
    code: false,
    time: true,
    teacher: false,
    venue: true,
    credits: false,
  },
  fieldOrder: ["code", "title", "time", "teacher", "venue", "credits"],
};

describe("timetable export display preferences", () => {
  test("keeps course codes off by default and enables them explicitly", () => {
    expect(setTimetableCourseCodeDisplay(preferences, false).display.code).toBe(
      false,
    );
    expect(setTimetableCourseCodeDisplay(preferences, true).display.code).toBe(
      true,
    );
  });
});
