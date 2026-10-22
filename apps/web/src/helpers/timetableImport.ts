import type { CustomTimetableStorage } from "@/types/timetable";

export type TimetableImportState = {
  courses: Record<string, string[]>;
  customItems: CustomTimetableStorage;
  colorMap: Record<string, string>;
};

export type TimetableImportOptions = {
  courseMode?: "merge" | "replace";
  preserveCustomItems?: boolean;
};

/** Merge a shared timetable without clearing semesters absent from the share. */
export const mergeTimetableImport = (
  current: TimetableImportState,
  shared: TimetableImportState,
  options: TimetableImportOptions = {},
): TimetableImportState => {
  const courses = { ...current.courses };
  const customItems = { ...current.customItems };
  const sharedSemesters = new Set([
    ...Object.keys(shared.courses),
    ...Object.keys(shared.customItems),
  ]);

  for (const semester of sharedSemesters) {
    const semesterCourses = shared.courses[semester] ?? [];
    const semesterItems = shared.customItems[semester] ?? [];
    if (semesterCourses.length === 0 && semesterItems.length === 0) continue;

    courses[semester] =
      options.courseMode === "merge"
        ? [...new Set([...(courses[semester] ?? []), ...semesterCourses])]
        : [...semesterCourses];
    if (
      options.preserveCustomItems &&
      !Object.prototype.hasOwnProperty.call(shared.customItems, semester)
    ) {
      continue;
    }
    if (semesterItems.length > 0) {
      customItems[semester] = [...semesterItems];
    } else {
      delete customItems[semester];
    }
  }

  return {
    courses,
    customItems,
    colorMap: { ...current.colorMap, ...shared.colorMap },
  };
};
