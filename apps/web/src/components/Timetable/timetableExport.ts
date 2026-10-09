import type { TimetableDisplayPreferences } from "@/hooks/contexts/useUserTimetable";

export const setTimetableCourseCodeDisplay = (
  preferences: TimetableDisplayPreferences,
  showCourseCode: boolean,
): TimetableDisplayPreferences => ({
  ...preferences,
  display: {
    ...preferences.display,
    code: showCourseCode,
  },
});
