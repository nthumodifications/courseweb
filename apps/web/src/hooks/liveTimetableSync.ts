import type { SharedTimetable } from "./useTimetableShare";
import type { CustomTimetableItemInput } from "@/types/timetable";

export type LiveTimetablePayload = {
  courses: Record<string, string[]>;
  customItems: Record<string, CustomTimetableItemInput[]>;
};

/**
 * Build the portion of the local timetable selected by a live share.
 * Empty arrays are intentional because they propagate deletions.
 */
export const getLiveTimetablePayload = (
  semesters: readonly string[],
  courses: Readonly<Record<string, readonly string[]>>,
  customItems: Readonly<Record<string, readonly CustomTimetableItemInput[]>>,
): LiveTimetablePayload => ({
  courses: Object.fromEntries(
    semesters.map((semester) => [semester, [...(courses[semester] ?? [])]]),
  ),
  customItems: Object.fromEntries(
    semesters.map((semester) => [semester, [...(customItems[semester] ?? [])]]),
  ),
});

export const getLiveTimetablePayloadKey = (payload: LiveTimetablePayload) =>
  JSON.stringify(payload);

export const getPublishedLiveTimetablePayload = (
  share: Pick<SharedTimetable, "semesters" | "courses" | "customItems">,
) =>
  getLiveTimetablePayload(
    share.semesters,
    share.courses,
    share.customItems ?? {},
  );
