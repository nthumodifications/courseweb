/**
 * @fileoverview
 * Data synchronization tools for CourseWeb
 * Provides utilities for syncing course data, syllabus information, and search indices
 */

export {
  default as syncCourses,
  syncCourses as runSyncCourses,
} from "./sync-courses";
export {
  default as startScheduledSync,
  syncCourseData,
} from "./update-courses";

// Re-export the main sync function for convenience
export const runSync = async (semester?: string) => {
  const { syncCourses } = await import("./sync-courses");
  return syncCourses(semester);
};

// Re-export the scheduled update function
export const runScheduledUpdate = (cronPattern?: string, semester?: string) => {
  const { startScheduledSync } = require("./update-courses");
  return startScheduledSync(cronPattern, semester);
};
